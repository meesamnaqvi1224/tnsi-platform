'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Heading, Input, Stack, Text, Textarea } from '@tnsi/ui';
import {
  charactersLeft,
  describeReflectionError,
  EMPTY_FIELDS,
  fieldsOf,
  formatReflectionDate,
  hasUnsavedChanges,
  isBlank,
  newClientId,
  PRIVACY_LINE,
  REFLECTION_CONTENT_MAX,
  REFLECTION_DELETE,
  REFLECTION_EDITOR,
  REFLECTION_STATES,
  REFLECTION_TITLE_MAX,
  saveReflection,
  type ReflectionFields,
  type SaveTarget,
} from '@tnsi/core';
import { reflectionsApi } from '@/lib/reflections-web-client';

/** The entry as the page passes it down: dates as ISO strings. Never includes an owner id. */
export interface EditorEntry {
  id: string;
  title: string | null;
  content: string;
  status: 'draft' | 'saved';
  createdAt: string;
}

type Feedback = { tone: 'ok' | 'error'; text: string } | null;
type Busy = 'idle' | 'saving' | 'deleting';

const LIST_PATH = '/dashboard/reflections';

/**
 * The editor for one reflection: a new one, or an existing draft or saved reflection.
 *
 * Privacy: the writing lives only in this component's memory until the member saves it to their own
 * journal. It is never put in a URL, device storage, a log or an analytics event (the page is also
 * excluded from analytics). A saved reflection can be edited but never returned to a draft.
 *
 * Reliability: a new reflection gets one client id for its whole life, so a double click or a retry after a
 * dropped connection cannot create a second entry, and a failed save never clears what was typed.
 *
 * Leaving with unsaved writing asks first: closing or reloading the tab, using the on-page Back link, or
 * following any link on the page. The browser's own Back button cannot be intercepted reliably in this
 * router, so "Save as Draft" stays one click away.
 */
export function ReflectionEditor({ initialEntry }: { initialEntry: EditorEntry | null }) {
  const router = useRouter();
  const [clientId] = React.useState(() => newClientId());
  const [entry, setEntry] = React.useState<EditorEntry | null>(initialEntry);
  const [fields, setFields] = React.useState<ReflectionFields>(
    initialEntry ? fieldsOf(initialEntry) : EMPTY_FIELDS,
  );
  const [baseline, setBaseline] = React.useState<ReflectionFields>(
    initialEntry ? fieldsOf(initialEntry) : EMPTY_FIELDS,
  );
  const [busy, setBusy] = React.useState<Busy>('idle');
  const [feedback, setFeedback] = React.useState<Feedback>(null);
  const [locked, setLocked] = React.useState(false);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  const dirty = hasUnsavedChanges(fields, baseline);
  const working = busy !== 'idle';
  const allowLeave = React.useRef(false);

  // The newest values for handlers that outlive a render (document-level listeners).
  const latest = React.useRef({ entry, fields, dirty, busy });
  React.useEffect(() => {
    latest.current = { entry, fields, dirty, busy };
  });

  const leaveDialog = React.useRef<HTMLDialogElement>(null);
  const deleteDialog = React.useRef<HTMLDialogElement>(null);

  // Closing or reloading the tab with unsaved writing.
  React.useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (allowLeave.current || !latest.current.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Following any same-site link on the page (sidebar, header, the Back link) with unsaved writing.
  React.useEffect(() => {
    function onClick(event: MouseEvent) {
      if (allowLeave.current || !latest.current.dirty) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.(
        'a[href]',
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        (anchor.target && anchor.target !== '_self') ||
        anchor.hasAttribute('download')
      )
        return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname + url.search);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Show the "unsaved changes" dialog when a link click was intercepted.
  React.useEffect(() => {
    const dialog = leaveDialog.current;
    if (!dialog) return;
    if (pendingHref && !dialog.open) dialog.showModal();
    if (!pendingHref && dialog.open) dialog.close();
  }, [pendingHref]);

  function leaveTo(href: string) {
    allowLeave.current = true;
    router.push(href);
  }

  /** Saves what is on screen. Resolves true only when the server confirmed it. */
  async function save(target: SaveTarget): Promise<boolean> {
    const current = latest.current;
    if (current.busy !== 'idle') return false;
    setBusy('saving');
    setFeedback(null);
    try {
      const result = await saveReflection({
        api: reflectionsApi,
        clientId,
        existing: current.entry,
        fields: current.fields,
        target,
      });
      setEntry(result as EditorEntry);
      setBaseline(fieldsOf(result));
      return true;
    } catch (err) {
      const described = describeReflectionError(err, 'save');
      if (described.kind === 'locked') setLocked(true);
      setFeedback({ tone: 'error', text: described.message });
      return false;
    } finally {
      setBusy('idle');
    }
  }

  async function onSave() {
    const current = latest.current;
    if (isBlank(current.fields)) {
      setFeedback({ tone: 'error', text: REFLECTION_STATES.needsText });
      return;
    }
    if (current.entry?.status === 'saved' && !current.dirty) {
      leaveTo(`${LIST_PATH}?notice=saved`);
      return;
    }
    if (await save('saved')) leaveTo(`${LIST_PATH}?notice=saved`);
  }

  async function onDraft() {
    if (await save('draft')) setFeedback({ tone: 'ok', text: REFLECTION_EDITOR.draftSavedMessage });
  }

  async function onLeaveSave() {
    const current = latest.current;
    const isSaved = current.entry?.status === 'saved';
    if (isSaved && isBlank(current.fields)) return;
    const href = pendingHref;
    if (await save(isSaved ? 'saved' : 'draft')) {
      setPendingHref(null);
      if (href) leaveTo(href);
    } else {
      setPendingHref(null);
    }
  }

  async function onDeleteConfirmed() {
    const target = latest.current.entry;
    deleteDialog.current?.close();
    if (!target || latest.current.busy !== 'idle') return;
    setBusy('deleting');
    setFeedback(null);
    try {
      await reflectionsApi.delete(`/api/v1/journal/entries/${target.id}`);
      leaveTo(LIST_PATH);
    } catch (err) {
      const described = describeReflectionError(err, 'delete');
      // Already gone (for example deleted on another device) is the outcome the member wanted.
      if (described.kind === 'not_found') {
        leaveTo(LIST_PATH);
        return;
      }
      if (described.kind === 'locked') setLocked(true);
      setFeedback({ tone: 'error', text: described.message });
      setBusy('idle');
    }
  }

  const left = charactersLeft(fields.content);
  const isSavedEntry = entry?.status === 'saved';
  const canSaveOnLeave = !isSavedEntry || !isBlank(fields);

  if (locked) {
    return <Alert variant="destructive">{REFLECTION_STATES.lockedForDeletion}</Alert>;
  }

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <NextLink href={LIST_PATH} className="interaction-focus text-sm underline">
          {REFLECTION_STATES.backToList}
        </NextLink>
        <Heading as="h1" size="xl">
          {REFLECTION_EDITOR.pageTitle}
        </Heading>
        <Text tone="muted" size="sm">
          {PRIVACY_LINE}
        </Text>
        {entry ? (
          <Text tone="muted" size="sm">
            {formatReflectionDate(entry.createdAt)}
          </Text>
        ) : null}
      </Stack>

      <Stack gap="md">
        <Input
          value={fields.title}
          onChange={(event) => {
            setFields((f) => ({ ...f, title: event.target.value }));
            setFeedback((c) => (c?.tone === 'error' ? null : c));
          }}
          placeholder={REFLECTION_EDITOR.titlePlaceholder}
          aria-label={REFLECTION_EDITOR.titlePlaceholder}
          maxLength={REFLECTION_TITLE_MAX}
          disabled={working}
          autoComplete="off"
        />
        <Textarea
          value={fields.content}
          onChange={(event) => {
            setFields((f) => ({ ...f, content: event.target.value }));
            setFeedback((c) => (c?.tone === 'error' ? null : c));
          }}
          placeholder={REFLECTION_EDITOR.writingPlaceholder}
          aria-label={REFLECTION_EDITOR.writingPlaceholder}
          maxLength={REFLECTION_CONTENT_MAX}
          disabled={working}
          rows={14}
          autoFocus={!initialEntry}
          className="min-h-64 text-base leading-relaxed"
        />
        {left !== null ? (
          <Text tone="muted" size="xs" className="text-right">
            {left} characters left
          </Text>
        ) : null}
      </Stack>

      <div aria-live="polite" className="min-h-6">
        {busy === 'saving' ? (
          <Text tone="muted">{REFLECTION_EDITOR.savingMessage}</Text>
        ) : feedback ? (
          <Alert variant={feedback.tone === 'error' ? 'destructive' : 'success'}>
            {feedback.text}
          </Alert>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" size="lg" onClick={onSave} disabled={working}>
          {REFLECTION_EDITOR.saveButton}
        </Button>
        {!entry || entry.status === 'draft' ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onDraft}
            disabled={working || !dirty}
          >
            {REFLECTION_EDITOR.draftButton}
          </Button>
        ) : null}
        {entry ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => deleteDialog.current?.showModal()}
            disabled={working}
          >
            {REFLECTION_EDITOR.deleteButton}
          </Button>
        ) : null}
      </div>

      {entry ? (
        <dialog
          ref={deleteDialog}
          aria-labelledby="delete-reflection-title"
          className="bg-background text-foreground m-auto max-w-md rounded-xl border p-6 backdrop:bg-black/40"
        >
          <Stack gap="md">
            <Heading as="h2" size="md" id="delete-reflection-title">
              {REFLECTION_DELETE.title}
            </Heading>
            <Text tone="muted">{REFLECTION_DELETE.message}</Text>
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => deleteDialog.current?.close()}>
                {REFLECTION_DELETE.cancel}
              </Button>
              <Button type="button" onClick={onDeleteConfirmed}>
                {REFLECTION_DELETE.confirm}
              </Button>
            </div>
          </Stack>
        </dialog>
      ) : null}

      <dialog
        ref={leaveDialog}
        aria-labelledby="leave-reflection-title"
        onClose={() => setPendingHref(null)}
        className="bg-background text-foreground m-auto max-w-md rounded-xl border p-6 backdrop:bg-black/40"
      >
        <Stack gap="md">
          <Heading as="h2" size="md" id="leave-reflection-title">
            {REFLECTION_EDITOR.unsavedMessage}
          </Heading>
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setPendingHref(null)}>
              {REFLECTION_EDITOR.unsavedKeepEditing}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const href = pendingHref;
                setPendingHref(null);
                if (href) leaveTo(href);
              }}
            >
              {REFLECTION_EDITOR.unsavedDiscard}
            </Button>
            {canSaveOnLeave ? (
              <Button type="button" onClick={onLeaveSave} disabled={working}>
                {isSavedEntry ? REFLECTION_EDITOR.unsavedSave : REFLECTION_EDITOR.unsavedSaveDraft}
              </Button>
            ) : null}
          </div>
        </Stack>
      </dialog>
    </Stack>
  );
}
