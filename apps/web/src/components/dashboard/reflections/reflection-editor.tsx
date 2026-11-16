'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Heading, Input, Stack, Text, Textarea } from '@tnsi/ui';
import {
  charactersLeft,
  createAutosaver,
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
  type Autosaver,
  type ReflectionFields,
  type SaveTarget,
} from '@tnsi/core';
import {
  fitsKeepalive,
  reflectionsApi,
  reflectionsKeepaliveApi,
} from '@/lib/reflections-web-client';

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
/** Where the member was trying to go when the "unsaved changes" dialog opened. */
type Leaving = { kind: 'link'; href: string } | { kind: 'back' } | null;
type AutosaveNote = 'none' | 'saved' | 'failed';

const LIST_PATH = '/dashboard/reflections';
const defaultEntryPath = (id: string) => `${LIST_PATH}/${id}`;

/**
 * The editor for one reflection: a new one, or an existing draft or saved reflection.
 *
 * PRIVACY. The writing lives in this component's memory and, when the member chooses or autosave runs, in
 * their own journal on the server. It is never put in a URL, browser storage, a cookie, a log or an
 * analytics event (the page is also excluded from analytics). Only an id is ever in the address.
 *
 * NOT LOSING WORK. Three layers, because no single one is reliable in a browser:
 *  1. Server-side draft autosave (new and draft reflections): a quiet moment after typing, at least every
 *     15 seconds while typing, and a final attempt as the tab is hidden or closed. A saved reflection is
 *     never changed by autosave (it can never become a draft, and edits to it stay an explicit Save).
 *  2. The browser's Back button, tab close and reload with unsaved text, and any link on the page, open
 *     "You have unsaved changes..." (Back uses a history marker that exists only while there are unsaved
 *     changes).
 *  3. A failed save or autosave never clears what was typed; it is retried and the member is told.
 *
 * RELIABILITY. A new reflection gets one client id for its whole life, so a double click, an autosave racing
 * an explicit save, or a retry after a dropped connection cannot create a second entry. Saves never overlap.
 * On opening, the entry is re-read from the server so a stale copy restored by the browser's Back/Forward
 * cache can never be saved over newer text.
 */
export function ReflectionEditor({
  initialEntry,
  entryPathFor = defaultEntryPath,
}: {
  initialEntry: EditorEntry | null;
  /** Where an entry created here lives (the address is updated to it after the first autosave). */
  entryPathFor?: (id: string) => string;
}) {
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
  const [gone, setGone] = React.useState(false);
  const [leaving, setLeaving] = React.useState<Leaving>(null);
  const [autosaveNote, setAutosaveNote] = React.useState<AutosaveNote>('none');

  const dirty = hasUnsavedChanges(fields, baseline);
  const working = busy !== 'idle';

  const allowLeave = React.useRef(false);
  const sentinel = React.useRef(false);
  const autosaver = React.useRef<Autosaver | null>(null);
  const apiForSave = React.useRef(reflectionsApi);

  // The newest values for handlers that outlive a render (document listeners, the autosaver).
  const latest = React.useRef({ entry, fields, dirty, busy });
  React.useEffect(() => {
    latest.current = { entry, fields, dirty, busy };
  });

  const leaveDialog = React.useRef<HTMLDialogElement>(null);
  const deleteDialog = React.useRef<HTMLDialogElement>(null);

  /** Autosave applies to a new or draft reflection that has real text and unsaved changes. */
  const autosaveEligible = (): boolean => {
    const c = latest.current;
    return (!c.entry || c.entry.status === 'draft') && c.dirty && !isBlank(c.fields);
  };

  /** One autosave. Resolves true when the server confirmed it. Never throws, never touches `busy`. */
  const autosaveOnce = async (): Promise<boolean> => {
    if (!autosaveEligible()) return true;
    const sent = latest.current;
    try {
      const result = await saveReflection({
        api: apiForSave.current,
        clientId,
        existing: sent.entry,
        fields: sent.fields,
        target: 'draft',
      });
      const first = !sent.entry;
      // Visible to the next run immediately, before React re-renders.
      latest.current = { ...latest.current, entry: result as EditorEntry };
      setEntry(result as EditorEntry);
      setBaseline(fieldsOf(result));
      setAutosaveNote('saved');
      if (first) {
        // A refresh now reopens this same draft instead of a blank editor.
        window.history.replaceState(window.history.state, '', entryPathFor(result.id));
      }
      return true;
    } catch (err) {
      const described = describeReflectionError(err, 'save');
      if (described.kind === 'locked') {
        setLocked(true);
        autosaver.current?.cancel();
        return true; // nothing more can be saved; do not retry
      }
      if (described.kind === 'already_saved' || described.kind === 'not_found') {
        // The entry was saved or deleted elsewhere: stop autosaving it rather than retry forever.
        autosaver.current?.cancel();
        setAutosaveNote('failed');
        return true;
      }
      setAutosaveNote('failed');
      return false;
    }
  };
  const autosaveOnceRef = React.useRef(autosaveOnce);
  React.useEffect(() => {
    autosaveOnceRef.current = autosaveOnce;
  });

  React.useEffect(() => {
    const a = createAutosaver({
      run: () => autosaveOnceRef.current(),
      shouldRun: () => {
        const c = latest.current;
        return (!c.entry || c.entry.status === 'draft') && c.dirty && !isBlank(c.fields);
      },
    });
    autosaver.current = a;
    return () => a.cancel();
  }, []);

  /** Tell the autosaver an edit happened (it decides whether and when to save). */
  const edited = () => {
    setFeedback((c) => (c?.tone === 'error' ? null : c));
    setAutosaveNote('none');
    autosaver.current?.notifyChange();
  };

  // A final autosave as the tab is hidden or closed. `keepalive` lets the request finish after the page is
  // gone; browsers cap its body, so a very long reflection falls back to an ordinary request.
  React.useEffect(() => {
    function flushNow() {
      if (allowLeave.current || !autosaveEligible()) return;
      apiForSave.current = fitsKeepalive(latest.current.fields)
        ? reflectionsKeepaliveApi
        : reflectionsApi;
      void autosaver.current?.flush().finally(() => {
        apiForSave.current = reflectionsApi;
      });
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flushNow();
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushNow);
    };
  }, []);

  // Closing or reloading the tab with unsaved writing (the browser shows its own prompt).
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
      ) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setLeaving({ kind: 'link', href: url.pathname + url.search });
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // The browser's Back button. A router cannot veto Back, so while there are unsaved changes one extra
  // history entry (a marker, same address) sits on top: Back removes only the marker, and we decide what
  // happens next. The marker is skipped by the same Back when nothing is unsaved.
  React.useEffect(() => {
    if (dirty && !sentinel.current) {
      window.history.pushState(window.history.state, '', window.location.href);
      sentinel.current = true;
    }
  }, [dirty]);
  React.useEffect(() => {
    function onPopState() {
      if (!sentinel.current || allowLeave.current) return;
      if (latest.current.dirty) {
        // Put the marker back (at this entry's own address) and ask.
        const path = latest.current.entry
          ? entryPathFor(latest.current.entry.id)
          : window.location.pathname;
        window.history.pushState(window.history.state, '', path);
        setLeaving({ kind: 'back' });
      } else {
        // Nothing unsaved: this Back was meant to leave. Skip over the marker.
        sentinel.current = false;
        window.history.back();
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // (Reads refs only, so it is attached once.)
  }, []);

  // Show or hide the "unsaved changes" dialog.
  React.useEffect(() => {
    const dialog = leaveDialog.current;
    if (!dialog) return;
    if (leaving && !dialog.open) dialog.showModal();
    if (!leaving && dialog.open) dialog.close();
  }, [leaving]);

  // Re-read the entry from the server when this editor opens and when the browser restores it from its
  // Back/Forward cache, so a stale copy is never saved over newer text. Skipped once the member has typed.
  React.useEffect(() => {
    if (!initialEntry) return;
    const id = initialEntry.id;
    let cancelled = false;
    async function revalidate() {
      try {
        const fresh = await reflectionsApi.get<EditorEntry>(`/api/v1/journal/entries/${id}`);
        if (cancelled || latest.current.dirty) return;
        const cur = latest.current.entry;
        if (
          !cur ||
          fresh.content !== cur.content ||
          (fresh.title ?? '') !== (cur.title ?? '') ||
          fresh.status !== cur.status
        ) {
          latest.current = { ...latest.current, entry: fresh };
          setEntry(fresh);
          setFields(fieldsOf(fresh));
          setBaseline(fieldsOf(fresh));
        }
      } catch (err) {
        const described = describeReflectionError(err, 'load');
        if (described.kind === 'not_found') setGone(true);
        if (described.kind === 'locked') setLocked(true);
        // Any other failure keeps what the page loaded with.
      }
    }
    void revalidate();
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) void revalidate();
    }
    window.addEventListener('pageshow', onPageShow);
    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', onPageShow);
    };
    // (Once per opening of this entry.)
  }, []);

  function stopAutosave() {
    autosaver.current?.cancel();
  }

  function leaveTo(href: string) {
    allowLeave.current = true;
    stopAutosave();
    router.push(href);
  }

  function leaveBack() {
    allowLeave.current = true;
    stopAutosave();
    // Past this entry and the marker above it.
    window.history.go(sentinel.current ? -2 : -1);
  }

  function leaveNow(target: Leaving) {
    if (!target) return;
    if (target.kind === 'link') leaveTo(target.href);
    else leaveBack();
  }

  /** An explicit save. Waits for any autosave in flight first so the two never race. */
  async function save(target: SaveTarget): Promise<boolean> {
    if (latest.current.busy !== 'idle') return false;
    setBusy('saving');
    latest.current = { ...latest.current, busy: 'saving' };
    setFeedback(null);
    try {
      await autosaver.current?.settle();
      const current = latest.current;
      const result = await saveReflection({
        api: reflectionsApi,
        clientId,
        existing: current.entry,
        fields: current.fields,
        target,
      });
      const first = !current.entry;
      latest.current = { ...latest.current, entry: result as EditorEntry };
      setEntry(result as EditorEntry);
      setBaseline(fieldsOf(result));
      setAutosaveNote('none');
      // A refresh now reopens this same reflection instead of a blank editor.
      if (first) window.history.replaceState(window.history.state, '', entryPathFor(result.id));
      return true;
    } catch (err) {
      const described = describeReflectionError(err, 'save');
      if (described.kind === 'locked') setLocked(true);
      setFeedback({ tone: 'error', text: described.message });
      // The text is unsaved: let autosave keep trying for a draft.
      autosaver.current?.notifyChange();
      return false;
    } finally {
      latest.current = { ...latest.current, busy: 'idle' };
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
    const target = leaving;
    if (await save(isSaved ? 'saved' : 'draft')) {
      setLeaving(null);
      leaveNow(target);
    } else {
      setLeaving(null);
    }
  }

  async function onDeleteConfirmed() {
    const target = latest.current.entry;
    deleteDialog.current?.close();
    if (!target || latest.current.busy !== 'idle') return;
    stopAutosave();
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
  if (gone) {
    return (
      <Stack gap="md">
        <Alert variant="destructive">{REFLECTION_STATES.notFound}</Alert>
        <NextLink href={LIST_PATH} className="interaction-focus text-sm underline">
          {REFLECTION_STATES.backToList}
        </NextLink>
      </Stack>
    );
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
            edited();
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
            edited();
          }}
          placeholder={REFLECTION_EDITOR.writingPlaceholder}
          aria-label={REFLECTION_EDITOR.writingPlaceholder}
          maxLength={REFLECTION_CONTENT_MAX}
          disabled={working}
          rows={14}
          autoFocus={!initialEntry}
          className="min-h-64 text-base leading-relaxed"
        />
        <div className="flex items-start justify-between gap-3">
          <Text tone="muted" size="xs" aria-live="polite" data-testid="autosave-note">
            {autosaveNote === 'saved' && !dirty
              ? REFLECTION_EDITOR.autosavedMessage
              : autosaveNote === 'failed'
                ? REFLECTION_EDITOR.autosaveFailedMessage
                : ''}
          </Text>
          {left !== null ? (
            <Text tone="muted" size="xs" className="text-right">
              {left} characters left
            </Text>
          ) : null}
        </div>
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
        onClose={() => setLeaving(null)}
        className="bg-background text-foreground m-auto max-w-md rounded-xl border p-6 backdrop:bg-black/40"
      >
        <Stack gap="md">
          <Heading as="h2" size="md" id="leave-reflection-title">
            {REFLECTION_EDITOR.unsavedMessage}
          </Heading>
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setLeaving(null)}>
              {REFLECTION_EDITOR.unsavedKeepEditing}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const target = leaving;
                setLeaving(null);
                leaveNow(target);
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
