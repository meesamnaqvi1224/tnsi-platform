# Account deletion and data retention

**Status: implemented on the PR #54 branch; not merged, not deployed. Legal approval is still required
before release.** This document records what the code does, what it deliberately keeps and why, what has
not been verified, and the procedures that are requirements rather than implemented controls. It
implements the owner-delegated decisions of 16 November 2026 (Notion: _Decisions & Approvals Register_ and
_Product Specifications & Content Readiness_, "Decision closure — My Reflections privacy, retention and
deletion"). Those decisions are product decisions, **not legal approval**.

Labels used below: **VERIFIED** (checked by an automated test or by reading the configuration),
**NOT VERIFIED** (must not be claimed publicly), **LEGAL** (needs counsel), **REQUIREMENT** (a control
that must exist before launch but is not something this code can provide or prove).

Related: `docs/my-reflections-backend.md` §6 (journal locking and the #57 race fix),
`apps/web/src/lib/account-deletion.ts`, `apps/web/src/lib/account-data-erasure.ts`,
`apps/web/src/lib/crm-outbox.ts`.

## 1. What changed in this PR

| Decision (16 Nov 2026)                                                    | Before                                                                  | Now                                                                                                                           |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Q4: delete or anonymise account identity and personal activity            | Journal purged; account soft-deleted with email and name; all else kept | Activity deleted, account row anonymised, in the same transaction that marks the account deleted (§3)                         |
| Q5: delete the Flowi CRM contact; suppress marketing when deletion starts | Nothing                                                                 | Do-not-disturb queued and attempted when deletion starts; contact deletion queued at erasure and attempted; both retried (§4) |
| Q2/Q7: no absolute access or security claims                              | Public page drafted with a "6 hours" figure and "straight away"         | Wording rewritten to match behaviour; no access, encryption or timing claims (§8)                                             |
| Q6: 30-day maximum for manual backups; restore reconciliation             | Not documented                                                          | Policy and runbook documented (§7). **No backup was deleted and no Neon setting was changed.**                                |
| Q1: first-use consent                                                     | Not built                                                               | **Not built.** Assessed in §6; blocked on legal wording and lawful basis                                                      |

No database migration is added. Nothing in subscription, billing, check-in or recommendation behaviour is
changed, with one exception that only affects deleted accounts: the CRM membership sync no longer produces
an event for an account that has been deleted (it would otherwise send an anonymised placeholder address to
the CRM).

## 2. The deletion sequence

Postgres, Clerk and Flowi are separate systems and no transaction spans them. The order of the steps and
the state that is persisted are the safety design.

| Step | Action                                                                                                                                                                                                                                        | If it fails                                                                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Refuse while a paid Stripe subscription is running. Read-only.                                                                                                                                                                                | `409 SUBSCRIPTION_ACTIVE`, nothing changed. Pre-check error: `500`, nothing changed.                                                                                 |
| 1    | Mark deletion pending, under the member's **exclusive** journal lock. The journal is locked from here (423).                                                                                                                                  | `500 ACCOUNT_DELETION_FAILED`, nothing changed.                                                                                                                      |
| 2    | **Stop marketing.** One transaction: cancel every CRM event still queued for the member; queue one `account_suppress` job. Then one immediate attempt (do-not-disturb on the contact).                                                        | Could not be recorded: `502 ACCOUNT_DELETION_PENDING` (stage `crm_suppression`); retry. A slow or unavailable CRM does **not** fail this step: the job stays queued. |
| 3    | Purge the journal.                                                                                                                                                                                                                            | `502 ACCOUNT_DELETION_PENDING`; retry.                                                                                                                               |
| 4    | Delete the identity in Clerk (404 counts as success).                                                                                                                                                                                         | `502 ACCOUNT_DELETION_PENDING`; retry.                                                                                                                               |
| 5    | **Finalise in one transaction** under the exclusive lock (`softDeleteUser`): purge the journal again, delete the member's activity, cancel remaining CRM events, queue one `account_delete` job, anonymise the account row, set `deleted_at`. | `202 pending`. The Clerk `user.deleted` webhook runs the same transaction, and Clerk retries a failing webhook.                                                      |
| 6    | Delete the CRM contact: one immediate attempt at the queued job.                                                                                                                                                                              | Not confirmed: `202 pending`, **never `200`**. The job stays queued; the outbox worker retries it.                                                                   |

`200 { status: 'deleted' }` is returned only when every step, including step 6, has succeeded.

The Clerk `user.deleted` webhook (a deletion made in the Clerk dashboard, or the retry path for step 5)
runs step 5 and then sends queued CRM jobs. It does not run steps 0 to 4: a dashboard deletion bypasses the
subscription check and the suppression step, and goes straight to erasure and contact deletion.

**Concurrency (unchanged from PR #57, and relied on here).** Journal writes take the member's advisory
lock shared; steps 1 and 5 take it exclusive. Step 5 does all of its work after acquiring the lock and
inside one transaction, so the erasure is atomic with the account being marked deleted: a failure rolls all
of it back (**VERIFIED**: `account-erasure.integration.test.ts`, "atomic").

**Idempotency.** Every step can be repeated. A second run of step 5 finds nothing to delete, sees the
anonymised address and queues nothing; the `account_delete` job is queued once per member; `deleted_at`
keeps its first value (**VERIFIED**: "repeating the finalisation", "overlapping").

## 3. Data inventory: erased, anonymised, kept

### Erased when the account is deleted (rows deleted) — VERIFIED

| Data                                             | Table                                                   |
| ------------------------------------------------ | ------------------------------------------------------- |
| My Reflections entries and drafts                | `journal_entries`                                       |
| Check-ins (including notes)                      | `check_ins`                                             |
| Practice completions                             | `practice_completions`                                  |
| Quick post-practice reflections                  | `practice_reflections`                                  |
| Saved practices                                  | `practice_saves`                                        |
| PowerDrop usage                                  | `power_drop_usages`                                     |
| Assessment submissions linked to the account     | `assessment_submissions` where `user_id` is the member  |
| CRM events still queued for the member's address | `crm_outbox` (all kinds except the deletion job itself) |

### Anonymised (row kept as a tombstone) — VERIFIED

`users`: `email` is replaced by `deleted-<internal id>@deleted.invalid` (a reserved, undeliverable
domain), `full_name` and `avatar_url` are set to null, `metadata` to `{}`, `deleted_at` is set. The row
keeps its internal id, its **Clerk user id**, and its timestamps.

Why a tombstone rather than deleting the row (**security/integrity reason, LEGAL to confirm it is
acceptable**): it is what makes a deletion permanent. A repeated or late Clerk webhook finds it and does
nothing; a stale `user.updated` cannot re-create the person (`upsertUser` writes nothing to a deleted row,
**VERIFIED**); and a restored backup can be reconciled against it (§7). The Clerk user id is an opaque
identifier for an identity that has been deleted at Clerk; whether TNSI can still be said to hold
"personal data" by keeping it depends on what Clerk itself retains (**NOT VERIFIED**, §9).

### Kept, with the reason — each needs LEGAL confirmation of basis and period

| Data                                     | Where                           | Reason                                                                                                | Contains                                                                                         |
| ---------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Membership record                        | `entitlements`                  | Financial: reconciliation with Stripe (customer and subscription references), tier and period history | Stripe ids, tier, dates. No name or email                                                        |
| Trial-claim marker                       | `trial_claims`                  | Security/anti-abuse: one free trial per verified email                                                | An HMAC of the email keyed with a server secret. Not an email; not reversible without the secret |
| Deletion request record                  | `account_deletion_requests`     | Evidence that deletion was requested and when; keeps the journal locked                               | Internal id and a timestamp                                                                      |
| Account tombstone                        | `users` (anonymised)            | See above                                                                                             | Internal id, Clerk user id, timestamps                                                           |
| The deletion job, until the CRM confirms | `crm_outbox` (`account_delete`) | Operational: it is the only way to finish deleting the CRM contact                                    | The member's email **until the job succeeds**, then scrubbed to `deleted` (**VERIFIED**)         |
| Payment records                          | Stripe (not our database)       | Stripe's own legal obligations                                                                        | Whatever Stripe holds. Not deleted or changed by this application                                |

No retention **period** is implemented for the kept rows: they are kept indefinitely today. A period is a
legal decision (§9); implementing one is a follow-up.

### Not touched by account deletion — an open decision (LEGAL / owner)

- **Website-form submissions made while signed out** (`assessment_submissions` rows with no `user_id`,
  and anything already delivered to the CRM from the contact or newsletter forms) are matched to a person
  only by email address, not by account. They are not deleted. The CRM _contact_ for that email **is**
  deleted, which removes what the CRM held; the local unlinked assessment submission (email, answers,
  result) remains. The public page says so and tells people to contact us. Deciding to delete by
  email-match is a product and legal decision.
- **Backups and the provider's recovery history** (§7).
- **Provider-side copies and logs** at Clerk, Vercel, Neon and Flowi (**NOT VERIFIED**).

## 4. Flowi CRM

### What happens

- **When deletion starts (step 2):** queued CRM events for the member are cancelled, and an
  `account_suppress` job sets "do not disturb" on the existing contact. The job is durable and attempted
  immediately (3-second budget).
- **When the account is erased (step 5):** remaining queued events for the address are removed (including
  a suppression job that has not run, which the deletion supersedes) and one `account_delete` job is
  queued in the same transaction.
- **Step 6 / the worker:** the job looks the contact up by email and deletes it. "No such contact", or a
  404 on delete, is success. When it succeeds, the job's email is scrubbed immediately.
- **None of these calls can create a contact** (**VERIFIED** against a fake CRM and in the client tests):
  they only look up, update or delete an existing one, so a late or repeated job cannot bring a deleted
  contact back. After erasure the application produces no CRM events for the account.

### Failures (never reported as success)

| Situation                                             | Outcome                                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| CRM slow or down at step 2                            | Deletion continues. Suppression stays queued; if erasure happens first, the contact deletion supersedes it.                          |
| CRM cannot confirm deletion at step 6                 | `202 pending`; the member is told removal is still being finished. Job retried with back-off (2, 4, 8 … minutes, capped at 6 hours). |
| Credentials or permissions wrong (401/403/404 lookup) | Retried 5 times, then left `failed`. A `failed` job is **not** counted as done and keeps the email it needs.                         |
| Other 4xx                                             | `failed` after one attempt.                                                                                                          |
| CRM not configured in an environment                  | Treated as a configuration failure: deletion reports `202`, never `200`.                                                             |

### What is NOT verified, and manual requirements

1. **The three Flowi calls were run LIVE once, on 17 Nov 2026**, with `flowi.live-check.test.ts` (gated;
   see the file for how to run it). It created one synthetic contact on `example.com` with no tags and
   removed it again. **Verified against the real account:** the lookup finds the contact by email (and
   returns nothing for an unknown address and after deletion); `PUT /contacts/{id}` with `dnd: true` turns
   do-not-disturb on (read back as `dnd: true`) and repeating it is harmless; `DELETE /contacts/{id}`
   removes it; suppressing a contact that no longer exists does not recreate it; and the API token worked
   with contacts read and write permissions. **A defect was found and fixed:** a repeat delete of an
   already-deleted contact answers `400 {"message":"Contact not found for id:..."}`, not `404`, so the
   first version of the client would have recorded a retried deletion as a permanent failure. It now
   treats that exact response as "already gone" (any other 400 is still a failure). Two synthetic contacts
   were created and removed in total (the first run found the defect), both verified gone.
   **Not verified:** that `dnd: true` actually stops the campaigns and automations Caroline uses (needs a
   contact enrolled in one); and whether the run created the contact in the live location or a test
   location (the check used the credential in the owner's private file; the contact was visible to the
   Flowi connector attached to the live account). A new contact can fire that location's "contact
   created" automations; the owner should check Flowi for anything triggered by "TNSI deletion check".
2. **"Deleted" in Flowi is not verified to be permanent.** Whether Flowi keeps a deleted contact in a
   recycle bin, in conversation history, in opportunity records or in its own backups is a provider
   question (**NOT VERIFIED, LEGAL**).
3. **Retry cadence.** The outbox worker is a daily cron (`0 6 * * *`). Jobs are also attempted immediately
   by the deletion request and by the Clerk webhook, but a job that fails is next retried at the following
   worker run: up to about a day, not minutes. A more frequent schedule is a Vercel configuration change
   (not made here).
4. **Failed jobs need someone to look.** `failed` rows are counted in the worker route's response
   (`failedByCategory`) but nothing alerts on them. **REQUIREMENT:** a named person checks for failed
   `account_delete` jobs, and `requeueFailed` is run after the cause is fixed. Until then the member's
   email remains in that row.
5. **Suppression is only as good as Flowi's do-not-disturb.** Marketing sent from anywhere other than
   Flowi is outside this mechanism.

## 5. Response contract and member-facing messages

The HTTP contract is unchanged (`200`, `202`, `409`, `502`, `500`); `502` may now carry
`stage: 'crm_suppression'`. `202` now also covers "the CRM has not confirmed the contact is deleted".

| Server outcome  | Web                                                                                 | Mobile                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `200`           | Names what was deleted and says a small number of records are kept                  | "Your account has been closed. Your reflections, check-ins, practice history and saved practices have been deleted." |
| `202`           | Sign-in removed and reflections deleted; still finishing the rest. No time promised | Same meaning. The earlier "a few minutes" was removed: completion can wait for a background retry                    |
| `409`           | Membership still active; nothing deleted                                            | Same, with the steps to cancel                                                                                       |
| `502`           | Started but not finished; reflections locked; try again                             | Same                                                                                                                 |
| `500` / network | Nothing was deleted / could not confirm                                             | Same                                                                                                                 |

Both confirmations now say that some records are kept and point to the public page. No message says all
data is deleted.

## 6. First-use consent for My Reflections (assessment only — NOT implemented)

Decision Q1 requires a separate, affirmative acknowledgement before a member's first reflection. Nothing
is built, because the parts that make it lawful are not engineering decisions.

**What implementing it would take (engineering):**

1. **A durable consent record.** New table (a migration, so a separately approved production step), for
   example `journal_consents (user_id, policy_version, consented_at, withdrawn_at, source)`. A boolean in
   `users.metadata` would not be an adequate record and is wiped on deletion.
2. **Server-side enforcement.** `withJournalWrite` (and the create route) must refuse a write without a
   current consent, so the check cannot be skipped by calling the API directly. Reads of existing entries
   after withdrawal need a rule (below).
3. **UI on web and mobile** (the screens are in PR #58): a first-use screen with an unticked, separate
   control, not bundled with Terms; a way to see and withdraw consent later.
4. **Versioning:** re-prompting when the wording changes.
5. **Account deletion:** whether the consent record is erased with the account or kept as evidence.
6. **Tests** for refusal without consent, cross-member isolation, withdrawal and deletion.

**What must come from legal before any of that is built (do not invent):**

- the Article 6 lawful basis and the Article 9 condition (whether explicit consent is the right
  mechanism at all, or another basis applies);
- the exact wording, and what the member is told about storage location, access and retention;
- what withdrawal means in practice: stop new writing only, or also delete existing reflections, and how
  quickly;
- whether a minimum age applies and how it is checked;
- how long the consent record itself is kept, including after account deletion.

**Release consequence:** per Q1, My Reflections must not be enabled for members until this exists. PR #58
(the screens) should not go to production before it. The backend on `main` has no consent gate today.

## 7. Backups: retention policy and restore procedure

### Facts (read-only checks, 14 to 16 Nov 2026) — VERIFIED

- Neon project `mute-cherry-69840088`, Free plan, region `aws-us-east-2`. Point-in-time restore window
  6 hours. No scheduled backups.
- Manual backup branches: `pre-migration-0013-backup-2026-11-11` and
  `pre-my-reflections-0014-backup-2026-11-16`. Both were taken before the journal tables existed and
  contain **no reflections**. They do contain the account and activity data as it was on those dates,
  including data of anyone who deletes their account afterwards.

### Policy (decision Q6)

1. A manual backup branch is kept for **at most 30 calendar days** from creation.
2. Every manual backup branch has a named owner and a delete-by date, recorded here when it is created.
3. The 6-hour restore window is kept for V1.

| Branch                                      | Created     | Delete by       | Owner         |
| ------------------------------------------- | ----------- | --------------- | ------------- |
| `pre-migration-0013-backup-2026-11-11`      | 11 Nov 2026 | **11 Dec 2026** | Project owner |
| `pre-my-reflections-0014-backup-2026-11-16` | 16 Nov 2026 | **16 Dec 2026** | Project owner |

**Nothing enforces this.** Deleting a branch is a manual, separately approved operation; this PR deleted
nothing and changed no Neon setting. **REQUIREMENT:** the owner (or a calendar reminder they own) deletes
each branch by its date and records it here.

### Restore and deletion-reconciliation procedure (REQUIREMENT — a runbook, not automated, not rehearsed)

A backup or point-in-time restore can contain people who have since deleted their accounts. It must never
be put back into service as it is.

1. **Approve.** A restore is a production operation and needs explicit owner approval. Name the operator.
2. **Restore into isolation.** Create the restore as a new Neon branch that no deployment points at. Do
   not restore over the production branch.
3. **Take the authoritative deletion list from the current production database** before it is replaced:
   every `users` row with `deleted_at` set (internal id and Clerk user id), plus every
   `account_deletion_requests` row (internal id, time). The tombstone is the authoritative record of a
   completed deletion; the request row is the record of one that had started. If production is
   unavailable, use the newest copy of it that is, and treat the gap as an incident (step 7).
4. **Replay deletions on the restored branch.** For every id in the list, run the same finalisation the
   application uses (`softDeleteUser`, which purges the journal, erases activity and anonymises the row),
   and re-insert the `account_deletion_requests` row. Do this with the application's code against the
   isolated branch, not with hand-written SQL, so the result matches production behaviour.
5. **Do not let the replay contact the CRM.** The replay queues `account_delete` jobs. For deletions that
   had already completed, the contact is already gone and the job is harmless (a lookup that finds
   nothing), but run the outbox only after step 6.
6. **Verify.** For every id in the list: no rows in the erased tables (§3), the `users` row anonymised.
   Spot-check that members who were not deleted are intact. Record the counts.
7. **Check the gap.** Any deletion requested after the list was taken, or by anyone whose request is not
   in either source, cannot be replayed automatically. Compare against Clerk (a user that no longer exists
   in Clerk but is active in the restored data must be finalised) before switching over.
8. **Switch over** only after steps 4 to 7, with owner approval. Then delete the restore source and any
   intermediate branch within the 30-day rule, and record what was done.
9. **If deleted data was exposed** to members or staff during a restore, treat it as an incident (§8).

This procedure has not been rehearsed. A rehearsal on an isolated project is recommended before launch.

## 8. Privacy and access: what is enforced, and what is a requirement

### Enforced by the application — VERIFIED

- A member can read, change or delete only their own reflections; another member's entry is "not found",
  by page or by API.
- Journal responses are `private, no-store`; reflection text is not logged, not sent to analytics, not
  sent to the CRM, and not used for recommendations or any analysis.
- Deletion logs only a stage label and a short error code.

### Not claimed anywhere, because it is not verified

- That nobody at TNSI, or at Neon, Vercel, Clerk or Flowi, can access member data. Reflections are
  ordinary database content, not end-to-end encrypted. Anyone with database access could technically read
  them. The public wording says other members cannot see entries; it makes **no** statement about staff.
- Encryption at rest, provider log contents and retention, and who currently holds credentials.

### Requirements before launch (decision Q2/Q7) — REQUIREMENT, not verifiable from this repository

1. **Least privilege.** A written list of the named people (roles) with access to the production
   database, Neon console, Vercel project, Clerk dashboard and Flowi, with the reason for each. Remove
   anyone who does not need it.
2. **Authorised technical access.** A rule that reflection content is not read except where necessary
   for a stated purpose (security incident, a legal request, a member's own verified request, a repair
   that cannot be done otherwise), approved by the owner each time.
3. **Audit.** A log of each such access (who, when, why, what), kept by the owner. Confirm what the
   providers' own audit logs record and for how long.
4. **Incident procedure.** Who is told, how quickly, and who decides on notification to members and to
   the regulator if member data is exposed. Legal to confirm the notification duties.
5. **Credentials.** Database credentials are not shared between people or left on developer machines; the
   local development environment must not point at production.
6. **Evidence.** Record the date each item was checked, in the Decisions Register.

## 9. Remaining legal decisions

1. Lawful basis and special-category condition for journal content; the first-use consent design (§6).
2. International transfer mechanism for Neon (United States), Vercel, Clerk and Flowi; processor terms.
3. Each retained record in §3: lawful basis and retention period (membership record, trial marker,
   deletion request record, tombstone including the Clerk user id).
4. Whether unlinked website-form submissions must be deleted on account deletion (§3).
5. Whether Flowi's deletion is sufficient, and what Clerk, Vercel, Neon and Flowi retain after deletion.
6. Backups: that 30 days plus the provider's recovery history is acceptable, and the restore procedure.
7. The public Delete Your Account page and the in-app messages (wording in `account-deletion.ts`,
   `account-deletion-client.ts`, the mobile strings).
8. Controller details, privacy contact, DPO/ICO status and minimum age: **none is stated anywhere in this
   PR**; they must come from authoritative records before the privacy policy is updated.
9. Incident-notification duties (§8).
10. Apple and Google deletion and data-safety declarations against the shipped behaviour.

## 10. Known limitations

- **Activity written by a request already in flight.** Journal writes are protected by the advisory lock.
  Check-ins, completions, quick reflections and saves are not: a request that was authorised a moment
  before the account was deleted could still insert one row afterwards. That row would be linked only to
  the anonymised tombstone. Closing this means taking the same shared lock in those write paths, which
  changes check-in and practice code and was out of scope here. Any later run of the finalisation removes
  such rows.
- **Retained rows have no expiry** (§3).
- **A deletion made in the Clerk dashboard** skips the subscription check and the suppression step.
- **A CRM job that fails permanently** keeps the member's email until someone fixes the cause (§4).
- **`getOrCreateUser` can still un-delete a tombstone** if Clerk ever presented a valid session for a
  deleted Clerk user id. Clerk does not reuse ids, so this is not expected; the restored row would be the
  anonymised one, with the journal still locked.
- **Not verified against real services:** Clerk webhook delivery in production, the Flowi calls, and the
  hosted preview.

## 11. Tests

- `apps/web/src/lib/account-erasure.integration.test.ts` (real PostgreSQL, fake Clerk and CRM): erasure,
  anonymisation, retained records, bystander isolation, atomic rollback, suppression at start, CRM down at
  start and at the end, permanent CRM failure and requeue, already-deleted contact, webhook-only deletion,
  repeated finalisation, stale `user.updated`, no CRM events after deletion, the #57 barrier after
  erasure, overlapping deletions and webhooks, journal writers racing a full deletion.
- `apps/web/src/lib/account-deletion.test.ts`: step order, each failure stage, `pending_cleanup` when the
  CRM has not confirmed, logging.
- `packages/integrations/src/flowi.test.ts`: the three CRM calls (request shape, 404 and the live-observed
  400 "Contact not found" handling, other failures, never an upsert).
- `packages/integrations/src/flowi.live-check.test.ts`: the gated LIVE check of the three calls against a
  real Flowi account (skipped unless `FLOWI_LIVE_CHECK=yes` and credentials are set).
- `apps/web/src/app/api/webhooks/clerk/route.test.ts`: the follow-up send after `user.deleted`.
- Existing journal, concurrency and deletion-race suites (unchanged assertions; the CRM is faked in them).
