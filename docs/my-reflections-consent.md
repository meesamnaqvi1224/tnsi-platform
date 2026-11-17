# My Reflections: first-use acknowledgement

**Status: implemented in PR #58 (not merged, not deployed). The wording, the lawful basis and several
behaviours below are NOT approved. Migration 0015 has NOT been applied to any production database.**
Decision source: Decisions & Approvals Register, 16 Nov 2026, Q1 (owner-delegated product decision; not
legal approval).

## What was decided (Q1)

Require a **separate, affirmative** first-use acknowledgement before a member creates their first
reflection. It must explain that members may choose to include personal or health-related information,
that the text is stored in their account, and how to withdraw. It must not be bundled with the general
Terms or made a condition of unrelated TNSI services. Counsel must still confirm the UK GDPR Article 6
basis, the Article 9 condition (including whether explicit consent is the right mechanism), the exact
wording, withdrawal handling and the record kept.

## What is built

| Part               | Behaviour                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Record             | Table `journal_consents` (migration `0015_add_journal_consents`): one row per member holding `policy_version`, `consented_at`, `withdrawn_at`. No journal text, no email. Own table, so a deployment ahead of the migration cannot break sign-in (only the journal routes read it, and they fail closed).                                                                                |
| Enforcement        | **Server side, in the database transaction that writes.** Creating or changing a reflection (including a draft/autosave) requires a row for the CURRENT notice version that is not withdrawn; otherwise `403 JOURNAL_CONSENT_REQUIRED` and nothing is written. Reading and deleting never require it. Calling the API directly cannot skip it.                                           |
| API                | `GET /api/v1/journal/consent` (state), `POST` `{version}` (record; a version other than the current one is `409` so nobody is recorded as agreeing to wording they were not shown; idempotent, keeps the first time), `DELETE` (withdraw; idempotent). Same access rule, private/no-store, and the same deletion barrier as every journal write (PR #57): `423` once deletion has begun. |
| Web                | `/dashboard/reflections/new` shows the notice (unticked checkbox, button off until ticked, "Not now") instead of the editor until the member agrees. An existing reflection always opens (reading and deleting are always allowed); the notice appears above it when the acknowledgement is missing. The list page offers "Withdraw permission" (two steps) or "Agree" again.            |
| Mobile             | The new-reflection screen shows the notice until the member agrees. The list screen offers "Withdraw permission" (asks first) or "Agree and continue". If the state cannot be read, the editor opens as before and the server decides.                                                                                                                                                   |
| Versioning         | `JOURNAL_CONSENT_VERSION` (`@tnsi/core`) is currently `draft-2`, which marks the wording as unapproved (`draft-2`, 17 Nov 2026, adds the staff-access sentence required by decision Q2 and a line telling the member a record of their agreement is kept). Approved wording gets a new version; every member is then asked again before writing.                                         |
| Withdrawal meaning | **Product assumption, LEGAL to confirm:** withdrawing stops new writing and changes to existing reflections. It does **not** delete anything; the member can still read and delete what they wrote, or delete their account.                                                                                                                                                             |

All wording is in `packages/core/src/reflections/consent.ts` and is marked proposed. It states no lawful
basis, and makes no claim about encryption, who at TNSI can access data, or where data is hosted.

## What legal must provide before release (nothing here is invented)

1. The Article 6 lawful basis and the Article 9 condition, and whether this acknowledgement is the right
   mechanism (explicit consent versus something else). If counsel rejects it, the mechanism changes.
2. The exact wording of the notice, the checkbox and the withdrawal text; then set a new
   `JOURNAL_CONSENT_VERSION` and update `consent.ts` and its tests.
3. What withdrawal must do: stop writing only (as built), or also delete existing reflections, and how quickly.
4. The record: whether a history of past versions must be kept (today a newer acceptance replaces the row),
   how long it is kept, and whether it is kept or erased when an account is deleted.
   **Current behaviour:** the row is kept and holds only the member's internal id, a notice version and two
   timestamps. It is not touched by account deletion (PR #54). Document it in the retained-records list
   there if legal agrees; erasing it is a one-line change in `eraseMemberData`.
5. Whether a minimum age applies and how it is checked. Not decided and not invented here.
6. Where the notice must also appear (for example next to the privacy policy link).

## The release switch and the withdraw-and-delete choice

**Switch (`MY_REFLECTIONS_ENABLED`).** My Reflections is OFF unless the server environment variable is
exactly `true` (`apps/web/src/lib/reflections-flag.ts`). Merging the code therefore exposes nothing. When
OFF: every journal and consent API route answers 404, the three pages 404, the sidebar link and the
dashboard invitation are not rendered, and `GET /api/v1/features` reports `reflections: false` so the
mobile app hides its entry points (it fails closed if the answer cannot be read). Account deletion is not
affected; it erases journals regardless. To turn it on after counsel signs off: set the variable to `true`
in the Vercel Production environment and redeploy. To turn it off again, remove it or set it to anything
else and redeploy. Turning it off does not delete anyone's reflections; they are simply unreachable until
it is turned on again. The test suite runs with it ON (`apps/web/vitest.config.ts`).

**Withdraw and delete.** Withdrawing now offers a choice: keep the existing reflections (default) or delete
them all, the latter behind a second explicit confirmation on web and mobile. API:
`DELETE /api/v1/journal/consent` withdraws and keeps; `DELETE /api/v1/journal/consent?entries=delete`
withdraws and deletes every reflection and draft in the same transaction (all-or-nothing, under the shared
journal lock), returning `deletedEntries`. Only the exact value `delete` deletes anything. Wording is
PROPOSED and unapproved; counsel confirms.

## Release steps and consequences

- **Do not enable My Reflections for members until legal has approved this**, per Q1.
- **Migration 0015 must be applied to production BEFORE the code that reads it is deployed**, because
  `main` auto-deploys to production and the journal routes read `journal_consents` on every write. Until
  the table exists, creating or changing a reflection fails closed (no write succeeds; no member data is
  affected; sign-in is unaffected). Applying a production migration needs its own explicit approval, a
  fresh Neon backup branch first, and the same checks as 0014: ledger records it, table and constraint
  exist, existing tables unchanged.
- The migration is additive and idempotent (`CREATE TABLE IF NOT EXISTS`, constraint added in a guarded
  block). Its `when` (1794855418860) is later than 0014's, so drizzle will apply it.
- Members who already have reflections (none today: the journal is not live) would be asked once.

## Tests

- `journal-consent.integration.test.ts` (real PostgreSQL): refusal without acknowledgement (create and
  draft), nothing written on refusal, idempotent record, stale version refused, older notice no longer
  counts, withdrawal stops writing but reading and deleting work and the writing is untouched, agreeing
  again restores, isolation between members, record shape (no text or email), concurrent record/withdraw,
  writers racing a withdrawal, `423` after deletion has begun (marker and Clerk-side), malformed body.
- Route unit tests for the consent API and the `403` mapping on the entries routes.
- `@tnsi/core` tests for the wording (claims nothing unverified) and the error mapping; a mobile contract
  test.
- The existing journal, concurrency and deletion-race integration suites now seed an acknowledgement for
  the members they create, because they test other behaviour; the consent suite tests the gate itself.
