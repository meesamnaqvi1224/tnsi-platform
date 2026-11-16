/**
 * My Reflections: every member-facing string, in one place.
 *
 * STATUS: PROPOSED WORDING - NOT YET APPROVED BY CAROLINE. Each group below is marked
 * `REVIEW` so the whole set can be checked, edited and signed off in a single pass without
 * hunting through screens. Changing a string here changes it everywhere.
 *
 * The privacy line is member-facing copy only. It is NOT a statement about backup retention;
 * how long deleted data may persist in backups is explained separately by the privacy policy
 * (still pending approval).
 */

/** REVIEW: Home invitation. */
export const HOME_INVITATION = {
  eyebrow: 'A Moment for Yourself',
  body: 'Take a moment to pause, notice what’s present, and put your thoughts into words. There’s no right or wrong way to reflect.',
  button: 'Write a Reflection',
} as const;

/** REVIEW: the history screen, including its empty state. */
export const REFLECTIONS_LIST = {
  title: 'My Reflections',
  generalPrinciple:
    'Your reflections are personal. Write as much or as little as you like, whenever you feel ready.',
  emptyTitle: 'Your space to reflect',
  emptyBody:
    'This is your personal space to write, explore your thoughts, or capture something you want to remember.',
  emptyHint:
    'Start whenever you feel ready. There’s no pressure to write regularly or write a certain amount.',
  emptyButton: 'Write Your First Reflection',
  newButton: 'Write a Reflection',
  draftsHeading: 'Drafts',
  savedHeading: 'Saved reflections',
  loadMore: 'Load More',
} as const;

/** REVIEW: the editor. */
export const REFLECTION_EDITOR = {
  pageTitle: 'My Reflection',
  titlePlaceholder: 'Give your reflection a title (optional)',
  writingPlaceholder:
    'What’s on your mind? Start wherever you are. You don’t need to find the perfect words.',
  saveButton: 'Save Reflection',
  draftButton: 'Save as Draft',
  deleteButton: 'Delete Reflection',
  savingMessage: 'Saving your reflection…',
  draftSavedMessage: 'Your draft has been saved.',
  savedMessage: 'Your reflection has been saved.',
  unsavedMessage: 'You have unsaved changes. Would you like to save before leaving?',
  autosavedMessage: 'Draft saved automatically.',
  autosaveFailedMessage: 'We couldn’t save your draft automatically. Your writing is still here.',
  // Button labels for the unsaved-changes prompt. The wording supplied covers the message only.
  unsavedSaveDraft: 'Save Draft',
  unsavedSave: 'Save',
  unsavedDiscard: 'Discard',
  unsavedKeepEditing: 'Keep Editing',
} as const;

/** REVIEW: delete confirmation. */
export const REFLECTION_DELETE = {
  title: 'Delete this reflection?',
  message:
    'This reflection will be permanently deleted from your journal. You won’t be able to recover it.',
  cancel: 'Cancel',
  confirm: 'Delete Reflection',
} as const;

/** REVIEW: the privacy line shown wherever the member writes or reads. */
export const PRIVACY_LINE = 'Your reflections are private. Only you can see them.';

/**
 * REVIEW (not in the supplied wording, written to match its tone): messages for situations the
 * supplied copy did not cover. Calm, never blaming, and none claims something happened that did not.
 */
export const REFLECTION_STATES = {
  needsText: 'Write something first, then you can save your reflection.',
  loadFailed: 'We couldn’t open this reflection. Please try again.',
  notFound: 'This reflection is no longer available.',
  saveFailed: 'We couldn’t save just now. Your writing is still here. Please try again.',
  deleteFailed: 'We couldn’t delete this reflection. It has not been deleted. Please try again.',
  alreadySaved: 'This reflection has already been saved, so it can’t go back to a draft.',
  listFailed: 'We couldn’t load your reflections. Please try again.',
  lockedForDeletion:
    'Your account deletion is in progress, so your reflections can no longer be opened.',
  progressTitle: 'Your Reflections',
  progressBody: 'Your private writing space. Nothing here is counted or scored.',
  progressButton: 'Open My Reflections',
  tooLong: 'This is longer than a reflection can be. Please shorten it a little.',
  signedOut: 'Your session has ended. Please sign in again.',
  backToList: 'Back to My Reflections',
  network: 'Unable to reach TNSI. Please check your connection and try again.',
} as const;
