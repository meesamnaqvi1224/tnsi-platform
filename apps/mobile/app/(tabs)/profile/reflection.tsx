import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorNotice, PrimaryButton, ScreenContainer, ThemedText } from '@/components';
import { PageTitle } from '@/components/PageTitle';
import { home } from '@/components/home/homeTheme';
import { useApiClient } from '@/hooks/useApiClient';
import { useReflectionExit } from '@/hooks/useReflectionExit';
import { parseReflectionOrigin } from '@/lib/reflection-origin';
import { setReflectionNotice } from '@/lib/reflection-notice';
import {
  charactersLeft,
  createAutosaver,
  describeReflectionError,
  EMPTY_FIELDS,
  fieldsOf,
  formatReflectionDate,
  hasUnsavedChanges,
  isAutosaveEligible,
  isBlank,
  newClientId,
  REFLECTION_CONTENT_MAX,
  REFLECTION_TITLE_MAX,
  saveReflection,
  type Autosaver,
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
type AutosaveNote = 'none' | 'saved' | 'failed';

/**
 * The editor for one reflection: a new one, or an existing draft or saved reflection (`?id=`).
 *
 * Privacy: the writing lives only in this screen's memory until the member saves it to their own
 * journal. It is never put in a route, a URL, device storage, a log or a notification; the only route
 * parameter is the reflection's id. A saved reflection can be edited but never returned to a draft.
 *
 * Autosave: a new or draft reflection is saved to the member's own journal (never to the device) a quiet
 * moment after typing, at least every 15 seconds while typing, and when the app goes to the background.
 * A SAVED reflection is never autosaved; changing it stays an explicit Save. The scheduling is shared with
 * the website (`@tnsi/core`).
 *
 * Reliability: a new reflection gets one client id for its whole life, so a double tap, an autosave racing
 * an explicit save, or a retry after a dropped connection cannot create a second entry; saves never
 * overlap; and a failed save never clears what was typed.
 */
export default function ReflectionEditorScreen() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const origin = parseReflectionOrigin(from);
  const api = useApiClient();
  const router = useRouter();
  const navigation = useNavigation();
  const exit = useReflectionExit(origin);

  const [clientId] = useState(() => newClientId());
  const [phase, setPhase] = useState<Phase>(id ? 'loading' : 'ready');
  const [loadMessage, setLoadMessage] = useState('');
  const [entry, setEntry] = useState<ReflectionEntry | null>(null);
  const [fields, setFields] = useState<ReflectionFields>(EMPTY_FIELDS);
  const [baseline, setBaseline] = useState<ReflectionFields>(EMPTY_FIELDS);
  const [busy, setBusy] = useState<'idle' | 'saving' | 'deleting'>('idle');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [autosaveNote, setAutosaveNote] = useState<AutosaveNote>('none');
  const allowLeave = useRef(false);
  const autosaver = useRef<Autosaver | null>(null);

  const dirty = phase === 'ready' && hasUnsavedChanges(fields, baseline);

  // The newest values for callbacks that outlive a render (the unsaved-changes prompt and its Save
  // button). Updated in an effect, never during render.
  const latest = useRef({ entry, fields, dirty, busy });
  useEffect(() => {
    latest.current = { entry, fields, dirty, busy };
  });

  // `api` changes identity every render (see useApiClient.ts), so the autosaver reads it through a ref.
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  });

  /** One autosave. Resolves true when the server confirmed it. Never throws, never touches `busy`. */
  const autosaveOnce = async (): Promise<boolean> => {
    const sent = latest.current;
    if (!isAutosaveEligible(sent.entry, sent.fields, sent.dirty)) return true;
    try {
      const result = await saveReflection({
        api: apiRef.current,
        clientId,
        existing: sent.entry,
        fields: sent.fields,
        target: 'draft',
      });
      // Visible to the next run immediately, before React re-renders.
      latest.current = { ...latest.current, entry: result };
      setEntry(result);
      setBaseline(fieldsOf(result));
      setAutosaveNote('saved');
      // A failed explicit save said so earlier; the writing is safe now, so that message no longer applies.
      setFeedback((current) => (current?.tone === 'error' ? null : current));
      return true;
    } catch (err) {
      const described = describeReflectionError(err, 'save');
      if (described.kind === 'locked') {
        setPhase('locked');
        autosaver.current?.cancel();
        return true; // nothing more can be saved; do not retry
      }
      if (described.kind === 'already_saved' || described.kind === 'not_found') {
        // Saved or deleted elsewhere: stop autosaving it rather than retry forever.
        autosaver.current?.cancel();
        setAutosaveNote('failed');
        return true;
      }
      setAutosaveNote('failed');
      return false;
    }
  };
  const autosaveOnceRef = useRef(autosaveOnce);
  useEffect(() => {
    autosaveOnceRef.current = autosaveOnce;
  });

  useEffect(() => {
    const a = createAutosaver({
      run: () => autosaveOnceRef.current(),
      shouldRun: () => {
        const c = latest.current;
        return isAutosaveEligible(c.entry, c.fields, c.dirty);
      },
    });
    autosaver.current = a;
    // A final attempt as the app is backgrounded (the OS may suspend or end it).
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') void a.flush();
    });
    return () => {
      subscription.remove();
      a.cancel();
    };
  }, []);

  /** Tell the autosaver an edit happened (it decides whether and when to save). */
  const edited = () => {
    setFeedback((current) => (current?.tone === 'error' ? null : current));
    setAutosaveNote('none');
    autosaver.current?.notifyChange();
  };

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

  /**
   * Leaves the editor for the history. If the history is the screen underneath (the editor was opened
   * from it) this simply goes back; if the editor was opened from elsewhere (the Home card) the history
   * replaces it, so a saved or deleted reflection always lands on "My Reflections".
   */
  function leave() {
    allowLeave.current = true;
    autosaver.current?.cancel();
    const state = navigation.getState();
    const previous = state?.routes[(state.index ?? 0) - 1]?.name;
    if (previous === 'reflections') router.back();
    else
      router.replace({ pathname: '/profile/reflections', params: origin ? { from: origin } : {} });
  }

  /** Saves what is on screen. Resolves true only when the server confirmed it. */
  async function save(target: SaveTarget): Promise<boolean> {
    if (latest.current.busy !== 'idle') return false;
    setBusy('saving');
    latest.current = { ...latest.current, busy: 'saving' };
    setFeedback(null);
    try {
      // An autosave in flight finishes first, so the two never race.
      await autosaver.current?.settle();
      const current = latest.current;
      const result = await saveReflection({
        api: apiRef.current,
        clientId,
        existing: current.entry,
        fields: current.fields,
        target,
      });
      latest.current = { ...latest.current, entry: result };
      setEntry(result);
      setBaseline(fieldsOf(result));
      setAutosaveNote('none');
      return true;
    } catch (err) {
      const described = describeReflectionError(err, 'save');
      if (described.kind === 'locked') setPhase('locked');
      setFeedback({ tone: 'error', text: described.message });
      // The text is still unsaved: let autosave keep trying for a draft.
      autosaver.current?.notifyChange();
      return false;
    } finally {
      latest.current = { ...latest.current, busy: 'idle' };
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
    autosaver.current?.cancel();
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
    // The message is the body, not the title: Android cuts a long title short after two lines.
    Alert.alert(REFLECTION_EDITOR.pageTitle, REFLECTION_EDITOR.unsavedMessage, [
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

  /** Back (header chevron or Android's hardware Back): ask first if there is unsaved writing, else leave. */
  const handleBack = () => {
    if (latest.current.dirty) {
      promptUnsaved(() => {
        allowLeave.current = true;
        autosaver.current?.cancel();
        exit();
      });
      return;
    }
    allowLeave.current = true;
    autosaver.current?.cancel();
    exit();
  };
  const handleBackRef = useRef(handleBack);
  useEffect(() => {
    handleBackRef.current = handleBack;
  });

  // This screen draws its own back button (always), and takes Android's hardware Back, for two reasons.
  // On iOS the native back button pops the screen BEFORE a `beforeRemove` handler can stop it, so "Keep
  // Editing" would leave the member on the previous screen with their writing gone. And on both platforms
  // this screen may be the only route on Profile's stack (see useReflectionExit), where the native back
  // button does not exist and Android's Back would switch tabs without ever asking. Swipe-back is only
  // allowed while there is nothing unsaved; `beforeRemove` below stays as the safety net for any pop.
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !dirty,
      headerBackVisible: false,
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => handleBackRef.current()}
        >
          <Ionicons name="chevron-back" size={24} color={home.navy} />
        </Pressable>
      ),
    });
  }, [dirty, navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        // The first Back closes the keyboard, as on any Android screen.
        if (Keyboard.isVisible()) {
          Keyboard.dismiss();
          return true;
        }
        handleBackRef.current();
        return true;
      });
      return () => subscription.remove();
    }, []),
  );

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
                edited();
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
                edited();
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
            <View style={styles.noteRow}>
              <ThemedText
                variant="caption"
                color={home.ink}
                accessibilityLiveRegion="polite"
                style={styles.autosaveNote}
              >
                {autosaveNote === 'saved' && !dirty
                  ? REFLECTION_EDITOR.autosavedMessage
                  : autosaveNote === 'failed'
                    ? REFLECTION_EDITOR.autosaveFailedMessage
                    : ''}
              </ThemedText>
              {left !== null ? (
                <ThemedText variant="caption" color={home.ink} style={styles.counter}>
                  {left} characters left
                </ThemedText>
              ) : null}
            </View>

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
  noteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  autosaveNote: { flex: 1 },
  counter: { textAlign: 'right' },
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
