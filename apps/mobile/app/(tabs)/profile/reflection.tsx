import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View, type TextStyle } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorNotice, PrimaryButton, ScreenContainer, ThemedText } from '@/components';
import { PageTitle } from '@/components/PageTitle';
import { home } from '@/components/home/homeTheme';
import { useApiClient } from '@/hooks/useApiClient';
import { setReflectionNotice } from '@/lib/reflection-notice';
import {
  charactersLeft,
  describeReflectionError,
  EMPTY_FIELDS,
  fieldsOf,
  formatReflectionDate,
  hasUnsavedChanges,
  isBlank,
  newClientId,
  REFLECTION_CONTENT_MAX,
  REFLECTION_TITLE_MAX,
  saveReflection,
  type ReflectionFields,
  type SaveTarget,
} from '@/lib/reflections';
import {
  PRIVACY_LINE,
  REFLECTION_DELETE,
  REFLECTION_EDITOR,
  REFLECTION_STATES,
} from '@/lib/reflections-copy';
import { radius, spacing, typography } from '@/theme';
import type { ReflectionEntry } from '@/api/types';

type Phase = 'loading' | 'ready' | 'error' | 'gone' | 'locked';
type Feedback = { tone: 'ok' | 'error'; text: string } | null;

/**
 * The editor for one reflection: a new one, or an existing draft or saved reflection (`?id=`).
 *
 * Privacy: the writing lives only in this screen's memory until the member saves it to their own
 * journal. It is never put in a route, a URL, device storage, a log or a notification; the only route
 * parameter is the reflection's id. A saved reflection can be edited but never returned to a draft.
 *
 * Reliability: a new reflection gets one client id for its whole life, so a double tap or a retry after
 * a dropped connection cannot create a second entry; and a failed save never clears what was typed.
 */
export default function ReflectionEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const api = useApiClient();
  const router = useRouter();
  const navigation = useNavigation();

  const [clientId] = useState(() => newClientId());
  const [phase, setPhase] = useState<Phase>(id ? 'loading' : 'ready');
  const [loadMessage, setLoadMessage] = useState('');
  const [entry, setEntry] = useState<ReflectionEntry | null>(null);
  const [fields, setFields] = useState<ReflectionFields>(EMPTY_FIELDS);
  const [baseline, setBaseline] = useState<ReflectionFields>(EMPTY_FIELDS);
  const [busy, setBusy] = useState<'idle' | 'saving' | 'deleting'>('idle');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const allowLeave = useRef(false);

  const dirty = phase === 'ready' && hasUnsavedChanges(fields, baseline);

  // The newest values for callbacks that outlive a render (the unsaved-changes prompt and its Save
  // button). Updated in an effect, never during render.
  const latest = useRef({ entry, fields, dirty, busy });
  useEffect(() => {
    latest.current = { entry, fields, dirty, busy };
  });

  const loadEntry = useCallback(async () => {
    if (!id) return;
    setPhase('loading');
    try {
      const loaded = await api.get<ReflectionEntry>(`/api/v1/journal/entries/${id}`);
      setEntry(loaded);
      setFields(fieldsOf(loaded));
      setBaseline(fieldsOf(loaded));
      setPhase('ready');
    } catch (err) {
      const described = describeReflectionError(err, 'load');
      setLoadMessage(described.message);
      setPhase(
        described.kind === 'not_found' ? 'gone' : described.kind === 'locked' ? 'locked' : 'error',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `api` changes identity every render (see useApiClient.ts); `id` is the real input.
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    void loadEntry();
  }, [loadEntry]);

  function leave() {
    allowLeave.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/profile/reflections');
  }

  /** Saves what is on screen. Resolves true only when the server confirmed it. */
  async function save(target: SaveTarget): Promise<boolean> {
    const current = latest.current;
    if (current.busy !== 'idle') return false;
    setBusy('saving');
    setFeedback(null);
    try {
      const result = await saveReflection({
        api,
        clientId,
        existing: current.entry,
        fields: current.fields,
        target,
      });
      setEntry(result);
      setBaseline(fieldsOf(result));
      return true;
    } catch (err) {
      const described = describeReflectionError(err, 'save');
      if (described.kind === 'locked') setPhase('locked');
      setFeedback({ tone: 'error', text: described.message });
      return false;
    } finally {
      setBusy('idle');
    }
  }

  async function onSavePress() {
    const current = latest.current;
    if (isBlank(current.fields)) {
      setFeedback({ tone: 'error', text: REFLECTION_STATES.needsText });
      return;
    }
    // Nothing changed on an already-saved reflection: there is nothing to send.
    if (current.entry?.status === 'saved' && !current.dirty) {
      setReflectionNotice(REFLECTION_EDITOR.savedMessage);
      leave();
      return;
    }
    if (await save('saved')) {
      setReflectionNotice(REFLECTION_EDITOR.savedMessage);
      leave();
    }
  }

  async function onDraftPress() {
    if (await save('draft')) {
      setFeedback({ tone: 'ok', text: REFLECTION_EDITOR.draftSavedMessage });
    }
  }

  function confirmDelete() {
    if (!entry) return;
    const target = entry;
    Alert.alert(REFLECTION_DELETE.title, REFLECTION_DELETE.message, [
      { text: REFLECTION_DELETE.cancel, style: 'cancel' },
      {
        text: REFLECTION_DELETE.confirm,
        style: 'destructive',
        onPress: () => void runDelete(target),
      },
    ]);
  }

  async function runDelete(target: ReflectionEntry) {
    if (latest.current.busy !== 'idle') return;
    setBusy('deleting');
    setFeedback(null);
    try {
      await api.delete(`/api/v1/journal/entries/${target.id}`);
      leave();
    } catch (err) {
      const described = describeReflectionError(err, 'delete');
      // Already gone (for example deleted on another device) is the outcome the member wanted.
      if (described.kind === 'not_found') {
        leave();
        return;
      }
      if (described.kind === 'locked') setPhase('locked');
      setFeedback({ tone: 'error', text: described.message });
      setBusy('idle');
    }
  }

  /** `proceed` performs the navigation that was interrupted. */
  function promptUnsaved(proceed: () => void) {
    const current = latest.current;
    const isSaved = current.entry?.status === 'saved';
    const target: SaveTarget = isSaved ? 'saved' : 'draft';
    // A saved reflection cannot be saved empty, so the only ways out are to keep editing or discard.
    const canSave = target === 'draft' || !isBlank(current.fields);
    Alert.alert(REFLECTION_EDITOR.unsavedMessage, undefined, [
      ...(canSave
        ? [
            {
              text: isSaved ? REFLECTION_EDITOR.unsavedSave : REFLECTION_EDITOR.unsavedSaveDraft,
              onPress: () => {
                void (async () => {
                  if (await save(target)) {
                    setReflectionNotice(
                      isSaved
                        ? REFLECTION_EDITOR.savedMessage
                        : REFLECTION_EDITOR.draftSavedMessage,
                    );
                    allowLeave.current = true;
                    proceed();
                  }
                })();
              },
            },
          ]
        : []),
      {
        text: REFLECTION_EDITOR.unsavedDiscard,
        style: 'destructive' as const,
        onPress: () => {
          allowLeave.current = true;
          proceed();
        },
      },
      { text: REFLECTION_EDITOR.unsavedKeepEditing, style: 'cancel' as const },
    ]);
  }

  // While there is unsaved writing the native back button and swipe-back are replaced by a back button
  // the app controls. On iOS the native ones pop the screen BEFORE a `beforeRemove` handler can stop it
  // (React Navigation logs "removed natively but didn't get removed from JS state"), so "Keep Editing"
  // would leave the member on the previous screen with their writing gone. With no native pop there is
  // nothing to undo. Android's hardware back goes through navigation and is covered by `beforeRemove`.
  useEffect(() => {
    navigation.setOptions(
      dirty
        ? {
            gestureEnabled: false,
            headerBackVisible: false,
            headerLeft: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={12}
                onPress={() => promptUnsaved(() => navigation.goBack())}
              >
                <Ionicons name="chevron-back" size={24} color={home.navy} />
              </Pressable>
            ),
          }
        : { gestureEnabled: true, headerBackVisible: true, headerLeft: undefined },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `promptUnsaved` reads everything through `latest`, so only `dirty` changes the header.
  }, [dirty, navigation]);

  // Leaving with unsaved writing asks first. Covers the header back button, the Android back button
  // and swipe-back. `allowLeave` lets the screen's own successful exits through.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      const current = latest.current;
      if (allowLeave.current || !current.dirty) return;
      event.preventDefault();
      const action = event.data.action;
      promptUnsaved(() => navigation.dispatch(action));
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the listener reads everything through `latest`; it must be attached once.
  }, [navigation]);

  /** A failed-save message is about the last attempt; once the member edits again it no longer applies. */
  function clearErrorFeedback() {
    setFeedback((current) => (current?.tone === 'error' ? null : current));
  }

  const working = busy !== 'idle';
  const left = charactersLeft(fields.content);
  const canDraft = !entry || entry.status === 'draft';

  return (
    <ScreenContainer scroll underHeader keyboardPersistTaps keyboardAware background={home.page}>
      <View>
        <PageTitle title={REFLECTION_EDITOR.pageTitle} />

        {phase === 'loading' && <View accessibilityLabel="Loading" style={styles.skeleton} />}

        {phase === 'error' && <ErrorNotice message={loadMessage} onRetry={loadEntry} />}

        {phase === 'locked' && (
          <ErrorNotice message={loadMessage || REFLECTION_STATES.lockedForDeletion} />
        )}

        {phase === 'gone' && (
          <View>
            <ThemedText variant="body" color={home.ink} style={styles.gap}>
              {loadMessage}
            </ThemedText>
            <PrimaryButton label="Back" variant="secondary" onPress={leave} />
          </View>
        )}

        {phase === 'ready' && (
          <>
            <ThemedText variant="caption" color={home.ink} style={styles.privacy}>
              {PRIVACY_LINE}
            </ThemedText>
            {entry ? (
              <ThemedText variant="caption" color={home.ink} style={styles.privacy}>
                {formatReflectionDate(entry.createdAt)}
              </ThemedText>
            ) : null}

            <TextInput
              value={fields.title}
              onChangeText={(title) => {
                setFields((f) => ({ ...f, title }));
                clearErrorFeedback();
              }}
              placeholder={REFLECTION_EDITOR.titlePlaceholder}
              placeholderTextColor={home.ink + '99'}
              accessibilityLabel={REFLECTION_EDITOR.titlePlaceholder}
              maxLength={REFLECTION_TITLE_MAX}
              editable={!working}
              returnKeyType="next"
              style={[styles.input, styles.titleInput]}
            />
            <TextInput
              value={fields.content}
              onChangeText={(content) => {
                setFields((f) => ({ ...f, content }));
                clearErrorFeedback();
              }}
              placeholder={REFLECTION_EDITOR.writingPlaceholder}
              placeholderTextColor={home.ink + '99'}
              accessibilityLabel={REFLECTION_EDITOR.writingPlaceholder}
              maxLength={REFLECTION_CONTENT_MAX}
              editable={!working}
              multiline
              textAlignVertical="top"
              autoFocus={!id}
              style={[styles.input, styles.contentInput]}
            />
            {left !== null ? (
              <ThemedText variant="caption" color={home.ink} style={styles.counter}>
                {left} characters left
              </ThemedText>
            ) : null}

            <View accessibilityLiveRegion="polite" style={styles.feedbackSlot}>
              {busy === 'saving' ? (
                <ThemedText variant="body" color={home.ink}>
                  {REFLECTION_EDITOR.savingMessage}
                </ThemedText>
              ) : feedback ? (
                <ThemedText
                  variant="body"
                  color={feedback.tone === 'error' ? '#B3261E' : home.navy}
                >
                  {feedback.text}
                </ThemedText>
              ) : null}
            </View>

            <PrimaryButton
              label={REFLECTION_EDITOR.saveButton}
              onPress={onSavePress}
              loading={busy === 'saving'}
              disabled={working}
              style={styles.button}
            />
            {canDraft ? (
              <PrimaryButton
                label={REFLECTION_EDITOR.draftButton}
                variant="secondary"
                onPress={onDraftPress}
                disabled={working || !dirty}
                style={styles.button}
              />
            ) : null}
            {entry ? (
              <PrimaryButton
                label={REFLECTION_EDITOR.deleteButton}
                variant="secondary"
                onPress={confirmDelete}
                loading={busy === 'deleting'}
                disabled={working}
                style={styles.button}
              />
            ) : null}
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const inputText: TextStyle = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: home.navy,
};

const styles = StyleSheet.create({
  privacy: { marginBottom: spacing.sm },
  gap: { marginBottom: spacing.md },
  input: {
    ...inputText,
    borderWidth: 1,
    borderColor: home.border,
    borderRadius: radius.md,
    backgroundColor: home.page,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  titleInput: { marginTop: spacing.sm, marginBottom: spacing.md },
  contentInput: { minHeight: 200 },
  counter: { marginTop: spacing.xs, textAlign: 'right' },
  feedbackSlot: { minHeight: 28, marginVertical: spacing.md },
  button: { marginBottom: spacing.sm },
  skeleton: {
    height: 220,
    borderRadius: radius.md,
    backgroundColor: home.cool,
    borderWidth: 1,
    borderColor: home.border,
  },
});
