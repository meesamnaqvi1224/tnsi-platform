/**
 * My Reflections: the first-use acknowledgement (decision Q1, 16 Nov 2026).
 *
 * STATUS: PROPOSED WORDING - NOT APPROVED. The decision is to require a separate, affirmative step before
 * a member's first reflection, explaining that they may choose to include personal or health-related
 * information, that the text is stored in their account, and how to withdraw. Legal counsel must still
 * confirm the lawful basis (UK GDPR Article 6) and the special-category condition (Article 9), the exact
 * wording, what withdrawal means and how the record is kept. NOTHING below states a lawful basis, and it
 * claims nothing about encryption, staff access, or where the data is hosted. See
 * docs/my-reflections-consent.md.
 *
 * The version is part of the record: changing the wording means changing JOURNAL_CONSENT_VERSION, which
 * asks every member to acknowledge the new notice before they write again.
 */

/**
 * `draft-N` marks the notice as unapproved. `draft-2` (17 Nov 2026) adds the staff-access and consent-record
 * sentences required by decisions Q1/Q2. The approved wording gets its own version.
 */
export const JOURNAL_CONSENT_VERSION = 'draft-2';

/**
 * `granted`: has accepted the current notice and not withdrawn. `required`: has not accepted the
 * current notice (never, or an older version). `withdrawn`: accepted once, then withdrew.
 */
export type JournalConsentStatus = 'granted' | 'required' | 'withdrawn';

export interface JournalConsentState {
  status: JournalConsentStatus;
  /** The notice version the server currently asks for. */
  version: string;
}

/** The API error code returned (HTTP 403) when a write needs a current acknowledgement. */
export const JOURNAL_CONSENT_REQUIRED_CODE = 'JOURNAL_CONSENT_REQUIRED';

/** REVIEW (legal): every string in this block. */
export const JOURNAL_CONSENT_COPY = {
  title: 'Before you begin',
  intro:
    'My Reflections is a private place to write for yourself. You choose what to write, and you never have to write anything.',
  points: [
    'You may choose to include personal or health-related information. That is up to you.',
    'What you write is stored in your TNSI account so you can come back to it. Other members can’t see it, and we don’t use it to recommend practices or to analyse you. We don’t routinely read reflections. Limited, authorised technical access may sometimes be needed to keep the service running, to help you if you ask, or where the law requires it.',
    'You can stop at any time. Choose Withdraw permission in My Reflections, and you won’t be able to write new reflections or change existing ones. You can still delete what you’ve written, or delete your account.',
    'We keep a record that you agreed to this notice, and when. It does not include anything you wrote.',
  ],
  checkboxLabel:
    'I understand this, and I agree that what I write in My Reflections is stored in my account.',
  agreeButton: 'Agree and continue',
  notNowButton: 'Not now',
  saving: 'Saving…',
  failed: 'We couldn’t record your choice. Please try again.',
  withdraw: {
    button: 'Withdraw permission',
    confirmTitle: 'Withdraw permission?',
    confirmMessage:
      'You won’t be able to write new reflections or change existing ones. You can keep your existing reflections (you can still read and delete them) or delete them all now. You can agree again at any time.',
    confirmButton: 'Withdraw',
    cancelButton: 'Cancel',
    /** The choice offered at withdrawal (counsel to confirm). Keeping is the default; deleting is deliberate. */
    keepButton: 'Withdraw and keep my reflections',
    deleteButton: 'Withdraw and delete all my reflections',
    deleteWarning:
      'This permanently deletes every reflection and draft you have written. It can’t be undone.',
    deleteDone: 'Permission withdrawn and all your reflections deleted.',
    done: 'Permission withdrawn. You can agree again whenever you like.',
    failed: 'We couldn’t withdraw permission just now. Please try again.',
  },
  /** Shown if a save is refused because the acknowledgement is missing, withdrawn or out of date. */
  required: 'Please review and agree to the notice before writing. Your writing is still here.',
} as const;
