# My Reflections — backend, privacy and account deletion (PR 1)

Status: implemented on branch `feature/my-reflections-pr1-backend`; **not merged, not deployed, migration
not applied to production**. This PR is the foundation only: database, API, privacy protections and
account deletion. No journal screens (web or mobile), no guided prompts, no Sanity integration — those
are later PRs. Product decisions: Notion → "TNSI — Product Specifications & Content Readiness" → My
Reflections. **Release blockers and pending decisions are listed in §8 and are NOT complete.**

## 1. What this adds, and what it deliberately leaves alone

My Reflections is a private personal writing space. It is **independent** of the rest of the product:

- It is **not** `practice_reflections`. That table (the lightweight post-practice check-out: a feeling
  pill plus a short note, one per practice session) and `POST /api/v1/practices/[id]/reflection` are
  unchanged, as are the post-practice UI, My Journey, check-ins, the recommendation mapping, practice
  completion, billing and entitlements (Stripe is only _read_, never changed), and the four-tab mobile
  navigation.
- Nothing reads a journal entry to decide what a member is shown. No analysis, classification,
  recommendation or Human Expansion Theory inference of any kind. This is enforced by tests: only
  `lib/journal.ts` may touch the table, and check-in, practice, journey, billing and CRM code may not
  import the journal (`lib/journal-independence.test.ts`).

## 2. Data model (migration `0014_add_journal_entries`)

### `journal_entries`

| Column             | Type                        | Notes                                                                                                                                                                                                                                                                                                                       |
| ------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | uuid PK                     | Default `gen_random_uuid()`. May be **client-supplied** on create (idempotent creation, §4).                                                                                                                                                                                                                                |
| `user_id`          | uuid NOT NULL               | FK → `users(id)` **ON DELETE CASCADE**. Always the authenticated member; never read from a request.                                                                                                                                                                                                                         |
| `title`            | text, nullable              | ≤ 200 characters (CHECK).                                                                                                                                                                                                                                                                                                   |
| `content`          | text NOT NULL, default `''` | ≤ 20,000 characters (CHECK). Only a **draft** may be empty (CHECK).                                                                                                                                                                                                                                                         |
| `status`           | enum `journal_entry_status` | `draft` \| `saved`, default `draft`.                                                                                                                                                                                                                                                                                        |
| `entry_type`       | enum `journal_entry_type`   | `independent` \| `guided` \| `practice` \| `theory`, default `independent`. Descriptive only.                                                                                                                                                                                                                               |
| `prompt_id`        | text, nullable              | Sanity document id. Plain text, **not** a foreign key (prompts live in the CMS). Unused until the prompts PR.                                                                                                                                                                                                               |
| `prompt_text`      | text, nullable              | ≤ 2,000 (CHECK). Snapshot of the prompt wording shown when writing.                                                                                                                                                                                                                                                         |
| `practice_id`      | uuid, nullable              | FK → `practices(id)` **ON DELETE SET NULL** — removing a practice never deletes writing.                                                                                                                                                                                                                                    |
| `completion_id`    | uuid, nullable              | FK → `practice_completions(id)` **ON DELETE SET NULL**, same reason.                                                                                                                                                                                                                                                        |
| `theory_condition` | text, nullable              | CHECK: exactly `Safety`, `Capacity`, `Availability`, `Expansion`, `Participation` — the five **Human Expansion Theory** conditions as the app names them (`CONDITION_NAMES`). **Not** the recommendation states (`LOW`…`HIGH`) or categories (see below). A CHECK, not an enum, so a framework change is a constraint swap. |
| `created_at`       | timestamptz NOT NULL        | **When the writing began.** Never changes — saving or editing does not touch it.                                                                                                                                                                                                                                            |
| `updated_at`       | timestamptz NOT NULL        | Moves on every edit.                                                                                                                                                                                                                                                                                                        |

**HET conditions vs recommendation.** One _word_ appears in both frameworks — the HET condition
`Expansion` and the recommendation category `EXPANSION` — but they are different identifiers: the CHECK is
case-sensitive and rejects `EXPANSION`, `LOW`…`HIGH` and `GROUNDING`…`EXPANSION`. The recommendation
mapping (LOW→GROUNDING, LOW_MODERATE→REGULATION, MODERATE→CENTERING, MODERATE_HIGH→EMBODIMENT,
HIGH→EXPANSION) is not touched by this PR (`packages/core` has no changes) and is pinned by a test.

Indexes (both partial, so each stays small and exact):

- `idx_journal_entries_user_saved (user_id, created_at DESC, id DESC) WHERE status = 'saved'` — the history list.
- `idx_journal_entries_user_draft (user_id, updated_at DESC) WHERE status = 'draft'` — finding a draft to resume.

**Database guard trigger** `journal_entries_guard_update` (BEFORE UPDATE, a backstop beneath the API):
a saved entry can never return to `draft`; `created_at` is pinned to its original value whatever an
UPDATE says; an entry can never change owner.

### `users.deletion_requested_at` (new, nullable)

Set when a member starts deleting their account and kept until it completes (first request time preserved).
While it is set the account is in the **deletion-pending** state: a pending member can still sign in and
retry, but their journal is locked (§6). It is deliberately **not** `deleted_at`, which logs the member out
of everything and so would stop them retrying. `NULL` (the default) means no deletion in progress.

### Migration facts (revalidated against the repository, not assumed)

- Next journal index is **14**; tag `0014_add_journal_entries`; snapshot `meta/0014_snapshot.json`;
  `when` = `1794480320789`, later than 0013's `1794297000451` (drizzle skips a migration whose `when` is
  not later than the newest applied one).
- **Expand-only**: one new table, two new enum types, one function and trigger, and one new **nullable**
  column on `users`. Nothing existing is altered, renamed or dropped, so code from before this change runs
  unchanged against the migrated database.
- drizzle-kit 0.24 does not emit CHECK constraints or triggers, so those are hand-written at the end of
  `0014_add_journal_entries.sql` (same convention as `0000` and `0012`) and are idempotent; the rest of the
  file is generated. The migration was regenerated when `deletion_requested_at` was added, so the snapshot
  matches.
- **Rollback** (only ever needed before real data exists):
  `DROP TRIGGER journal_entries_guard_update ON journal_entries; DROP FUNCTION journal_entries_guard_update(); DROP TABLE journal_entries; DROP TYPE journal_entry_type; DROP TYPE journal_entry_status; ALTER TABLE users DROP COLUMN deletion_requested_at;`
  and remove its row from `drizzle.__drizzle_migrations`. After launch this would destroy members'
  writing; prefer a forward fix.
- **Rehearsal** (isolated database only; the drizzle config refuses the production host):
  `TNSI_TEST_DATABASE_URL="<isolated database>" pnpm --filter @tnsi/db exec drizzle-kit migrate`.
  **Do not run this against production without explicit approval**, a Neon backup branch first, and the
  same checks used for 0013.

## 3. API contract

Base path `/api/v1/journal`. Every route requires authentication **and** existing member access
(`requireMemberAccess`: any signed-in account, including a Free one — journaling is open to all members)
**and** that the account is not in the deletion-pending state; it enforces ownership on the server, and
returns **`Cache-Control: private, no-store, max-age=0`** on every response, errors included. Success body
`{ "data": … }`; error body `{ "error": { code, message, details? } }`.

| Route                 | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /entries`        | **Default: the member's SAVED entries only**, newest first by `created_at` (`id` as the tie-break, so paging never repeats or skips an entry). Query: `limit` 1–50 (default 20), `offset` ≥ 0, `status=saved\|draft`. **`status=draft` lists only the authenticated member's own drafts**, most recently touched first, to resume one; it never returns saved entries or anyone else's drafts. Returns `{ entries: [{ id, title, preview, previewTruncated, status, entryType, practiceId, completionId, theoryCondition, createdAt, updatedAt }], pagination: { limit, offset, hasMore } }`. The list carries a ≤ 200-character one-line **preview**, never the full text. Drafts never appear in the saved-entry history. |
| `POST /entries`       | Creates a draft (default) or a saved entry. Body: `id?` (uuid), `title?`, `content?`, `status?`, `entryType?`, `promptId?`, `promptText?`, `practiceId?`, `completionId?`, `theoryCondition?`. A `userId` in the body is ignored. `201` with the entry; `200` with the **existing** entry when the same client `id` was already created by this member.                                                                                                                                                                                                                                                                                                                                                                     |
| `GET /entries/:id`    | The full entry (including `content`), if it is the caller's — draft or saved, identically.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `PATCH /entries/:id`  | Edit `title` and/or `content`, or `status: 'saved'` (draft → saved). The links and type cannot be changed. `created_at` is preserved, `updated_at` moves. `status: 'draft'` on a saved entry is **409**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `DELETE /entries/:id` | Permanently deletes the caller's entry → `{ deleted: true }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

Status codes: `400` validation (field **names** only — see §5), `401` not signed in, `403` no account,
**`423 ACCOUNT_DELETION_PENDING`** the member has started deleting their account (§6), `404` not found
**or not yours** (indistinguishable by design, for drafts exactly as for saved entries), `409` saved →
draft refused (or the database refused a change), `413` body over 200,000 characters, `500` generic.

**Validation.** Title ≤ 200, content ≤ 20,000, prompt text ≤ 2,000 (counted in characters). A NUL byte is
rejected. A **saved** entry must have non-empty text (only a draft may be empty). `entryType: 'practice'`
needs a `practiceId` or `completionId`; `'theory'` needs a `theoryCondition` (one of the five above).

**References.** A `completionId` must be one of the **caller's own** practice sessions (someone else's is
`404`, identical to a missing one); with both ids given, the session must belong to that practice (`400`
otherwise); with only a `completionId` the `practiceId` is derived from it; a lone `practiceId` must exist.

**Idempotent creation.** Send a client-generated uuid as `id`. A retry (flaky connection, double tap)
returns the same entry with `200` and creates no second row; **the first write wins** — a replay does not
overwrite. If the id belongs to **another** member the response is `404`, exactly as for a missing entry.
Concurrent creates of one id are safe by construction (`INSERT … ON CONFLICT DO NOTHING`) — but see §8: that
has not been exercised across real connections.

**Updates.** The update is conditional on the status that was read, with one retry, so a save racing an
edit cannot revert a saved entry. Clients must serialise their own writes to one entry (a late autosave
sent after the Save would overwrite newer text — that ordering is the client's to keep).

**Progress.** Drafts and saved entries are not read by My Journey, the milestones or any practice or
check-in query (tested against the real journey queries and by a source scan).

## 4. Account status and deletion routes

| Route                       | Behaviour                                                                                                                                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/me/account`    | `{ status: 'active' \| 'pending', requestedAt }` — whether a deletion the member started is unfinished, so the app can say so and offer to finish it.                                                                            |
| `DELETE /api/v1/me/account` | Delete the account, or finish a deletion that stalled. Authenticated with `requireAuth` (any signed-in account) and deliberately **not** through the journal guard, so a pending member can retry. No body; no user id accepted. |

Outcomes of `DELETE`:

| Response                       | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200 { status: 'deleted' }`    | **Complete.** Returned only after every step in §6 has succeeded.                                                                                                                                                                                                                                                                                                                                                                |
| `202 { status: 'pending' }`    | The identity is deleted but local cleanup is still finishing (the Clerk webhook completes it). The member is signed out. **Not** "done".                                                                                                                                                                                                                                                                                         |
| `409 SUBSCRIPTION_ACTIVE`      | A paid Stripe subscription is still running. The message says why and what to do (cancel it first: in the app Profile → Membership & Access → Manage, which opens the website; once it is set to end, delete the account) and that nothing was deleted. `details`: `{ reason: 'ACTIVE_SUBSCRIPTION', nextStep: 'CANCEL_MEMBERSHIP', manageMembershipPath: '/dashboard/billing' }`. Nothing changed, not even the pending marker. |
| `500 ACCOUNT_DELETION_FAILED`  | Failed before anything started ("Nothing was deleted"). Retry.                                                                                                                                                                                                                                                                                                                                                                   |
| `502 ACCOUNT_DELETION_PENDING` | Deletion **started but did not finish**: the journal is already locked and the member is still signed in. `details.status: 'pending'`, `details.stage`. Retry to finish.                                                                                                                                                                                                                                                         |

## 5. Ownership and privacy model

- **Ownership is enforced in the server's queries, not the client.** Every function in
  `apps/web/src/lib/journal.ts` takes the authenticated member's id and filters by it; an entry id from a
  client is only a lookup key inside that scope. Another member's entry — draft or saved — is a `404`.
- **No journal text outside the database and the owner's own responses.** Never logged (the journal
  modules contain no logging; the route wrapper logs only a label and a short database error code — a
  driver error object can carry the SQL and its bound parameters, i.e. the writing, so the error itself is
  never logged); never in a URL or query string (ids only); never in an analytics event; never in
  validation errors (field names only, because a message can echo a value); never sent to the CRM (the six
  Flowi producers use fixed payload builders and none can carry journal text), marketing, support tools,
  session replay or any third party. No AI, sentiment, emotion classification or clinical interpretation.
- **Caching:** every journal response is `private, no-store` (`lib/private-response.ts`).
- **Analytics:** GA4 loads site-wide. `/dashboard/reflections` and everything under it is excluded
  (`lib/analytics-exclusions.ts`): the opt-out flag is set before GA's first config call, so not even the
  automatic first pageview is sent, and it switches back on when the member moves to any other page. Other
  pages are unchanged. The web journal screens arrive in a later PR under that path.
- **Backups.** Deleting rows removes them from the live database. They persist in backups and any Neon
  point-in-time/branch copies until those expire. See §8 — the retention period has **not** been determined.

## 6. Account deletion: final sequence and recovery

In the mobile app: **Profile → Delete Account** (confirmation, then the call). Postgres and Clerk are
separate systems; **no shared transaction is assumed or possible**. The **order** of the steps, plus the
persisted pending marker, is the safety design (`apps/web/src/lib/account-deletion.ts`):

| Step  | Action                                                                                                                                                                                                                             | If it fails                                                                                                                                                                                             |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** | **Pre-check:** refuse while a paid Stripe subscription is running (`status` active/trialing/past_due, has a subscription id, not set to cancel at period end). App-managed trials have no subscription and never block. Read-only. | Blocked: `409 SUBSCRIPTION_ACTIVE`, nothing changed (not even the marker). Pre-check error: `500`, nothing changed.                                                                                     |
| **1** | **Mark deletion pending** (`users.deletion_requested_at`, first request time kept). From here the journal is **locked**: every journal route returns `423`.                                                                        | Nothing has changed. `500 ACCOUNT_DELETION_FAILED`; stops. Retry.                                                                                                                                       |
| **2** | **Purge the journal** (one atomic DELETE of all the member's entries, drafts included).                                                                                                                                            | Deletion is **pending**: the journal is already locked (so unreachable even if rows remain). `502 ACCOUNT_DELETION_PENDING`. Member still signed in; retry.                                             |
| **3** | **Delete the identity in Clerk.** A Clerk `404` (already deleted) counts as success.                                                                                                                                               | Deletion is **pending**: journal gone and locked, account still exists and signed in. `502 ACCOUNT_DELETION_PENDING`. Retry; the purge is a harmless no-op and Clerk is retried.                        |
| **4** | **Finalise locally in ONE transaction** (`softDeleteUser`): purge any journal rows again **and** mark the user deleted. The second purge removes anything written by a request that was already in flight when step 1 ran.         | The identity is already gone, so the member cannot sign in. `202 pending` (never `200`). The Clerk `user.deleted` webhook runs the same transactional finalisation and Clerk retries a failing webhook. |

**Completion is only reported after all of the above succeeded** (`200 deleted`). Every response other than
that is an error status or `202 pending`, and the mobile wording never claims completion for anything else.

**What the member sees**

- **Pending (started, not finished):** the app says deletion "has started but isn't finished", that the
  journal can no longer be accessed, and to try again; Profile then shows an "Account deletion in progress"
  notice and the action becomes **Finish Deleting Account** (`GET /api/v1/me/account` tells the app, even
  after a restart).
- **Blocked by a subscription:** the app explains the membership is still active, the exact steps to cancel
  (Membership & Access → Manage, which opens the website) and that nothing was deleted, with a
  **Manage Membership** button straight to that screen.
- **Complete:** "Your account has been closed and your journal deleted", then sign-out. **202** says it is
  "being closed… a few minutes", not that it is done.

**A member whose deletion is pending cannot access journal data.** `requireJournalAccess` reads the marker
from the user row the auth layer already loads (no extra query) and every journal route — list, drafts,
read, create, edit, save, delete — returns `423 ACCOUNT_DELETION_PENDING` with no data. That includes a
**retried create with an old client id**, so a stalled deletion can never restore or re-expose writing.
The marker is set _before_ the purge, so there is no moment where deletion is in progress and the journal
is still reachable.

**Retries are safe.** Every step is idempotent: marking keeps the first time, purging an empty journal is a
no-op, Clerk's 404 is success, finalisation is a transaction that can be re-run. The only journal operation
anywhere in the flow is the purge — there is no restore. A retry after any failure completes the deletion;
after a completed deletion the session is invalid and any further call is `401`, which the app treats as
already signed out.

`softDeleteUser` is also what the existing Clerk `user.deleted` webhook calls, so a deletion started from
the Clerk dashboard purges the journal too. It is **transactional**: if marking the user deleted fails the
purge rolls back (proved in the integration tests), so there is never a state where the account is gone but
the writing remains, or the reverse. `ON DELETE CASCADE` on `user_id` covers a hard delete of the user row.

**Recovery summary**

| Situation                                               | State left                                 | Recovery                                                             |
| ------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| Fails at step 0 or 1                                    | Nothing changed                            | Member retries.                                                      |
| Fails at step 2 or 3                                    | Pending; journal locked; still signed in   | Member taps **Finish Deleting Account** (or retries).                |
| Fails at step 4                                         | Identity gone; local cleanup pending       | Clerk webhook retry finalises it; member is signed out.              |
| Clerk down for a long time                              | Pending; journal locked and already purged | Retry when Clerk is back. There is no "cancel deletion" — see §8.    |
| `user.deleted` webhook never arrives (misconfiguration) | Step 4 failed and no retry delivered       | Operational: run the same finalisation for that user. Not automated. |

### State machine

Six states. They are **not** six stored flags: three live in Postgres as real data, one is derived, one
lives in Clerk, and one is the HTTP response.

| #   | State                                   | Authoritative system   | Recorded as                                                                                                                                                        | Reached at               | Observable through                                                         |
| --- | --------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------- |
| 1   | **Deletion requested**                  | Postgres (ours)        | `users.deletion_requested_at` (first request time kept; never cleared)                                                                                             | Step 1                   | `GET /api/v1/me/account` → `pending`                                       |
| 2   | **Journal access locked**               | Postgres (ours)        | **Not stored separately** — derived from state 1 on every request (`requireJournalAccess`), so it is the same instant                                              | Step 1                   | every journal route → `423 ACCOUNT_DELETION_PENDING`                       |
| 3   | **Journal purged**                      | Postgres (ours)        | **No flag** — it is the _absence_ of `journal_entries` rows for the user                                                                                           | Step 2 (re-checked in 4) | database only (no API: the member has no access once locked)               |
| 4   | **Clerk identity deletion confirmed**   | **Clerk**              | **Not recorded in our database.** The route learns it from `deleteUser` succeeding (or returning 404); Clerk separately signals it with the `user.deleted` webhook | Step 3                   | the `DELETE` call result in that request; later, the webhook               |
| 5   | **Database account deletion completed** | Postgres (ours)        | `users.deleted_at` (**first** completion time kept)                                                                                                                | Step 4 _or_ the webhook  | the member can no longer authenticate (`getAuthUser` returns null → `401`) |
| 6   | **Final deletion confirmation**         | — (not a stored state) | The **`200 { status: 'deleted' }` response**, which exists only when states 1–5 all hold. The durable evidence is state 5 (with the marker kept)                   | End of step 4            | the HTTP response; afterwards a `401` on every call                        |

**What is and is not incomplete after Step 4.** If Step 4 **succeeds**, states 1–5 all hold and the route
returns **`200`** — **nothing is left incomplete**. The `202` is returned only when Step 4 **fails**, after
Clerk has already deleted the identity. So "Step 4 succeeded and the API returned 202" cannot happen: a
`202` means states 1–4 hold but state 5 is not yet confirmed.

**Exactly when the API returns 200 versus 202**

- **`200 deleted`** — if and only if all of: no active paid subscription; the pending marker was set; the
  journal purge succeeded; the Clerk identity is deleted (or already gone, a 404); and the local
  finalisation transaction (purge again + `deleted_at`) committed. Every step, in one request.
- **`202 pending`** — if and only if the Clerk identity is deleted **and** the finalisation transaction
  failed. Nothing earlier failed. The journal is already purged and locked.
- Everything else is an error status (`409`, `500`, `502`), never a success code.

**What the webhook does that Step 4 has not already done.** Clerk's `user.deleted` runs the _same_
`softDeleteUser` as Step 4: purge the journal and set `deleted_at`, in one transaction. So:

- **After a successful Step 4** (the normal case — Clerk always sends the event _after_ our own
  `deleteUser`): the webhook adds **nothing**. Its purge finds no rows and `deleted_at` is already set. A
  retried delivery is equally a no-op. (This was a real inconsistency, now fixed: `softDeleteUser`
  previously overwrote `deleted_at` on every call, so the webhook moved the completion time later. It now
  keeps the **first** completion time, and tests prove a late or repeated webhook changes nothing.)
- **After a failed Step 4:** the webhook is what performs state 5 (and re-checks state 3). It is also what
  covers a crash (for example a function timeout) between Clerk's deletion and our finalisation, because
  Clerk sends the event regardless of what our request managed to do.
- **A deletion started from the Clerk dashboard** (not our route): the webhook is the only path, and it
  purges the journal and sets `deleted_at` in one transaction.

**If the webhook is delayed or never arrives.** While it is outstanding the state is **safe but not
marked complete**: marker set, journal purged (or locked), identity deleted in Clerk, `deleted_at` still
`NULL`, no `200` ever claimed. The member cannot sign in; nothing is exposed. A _delayed_ webhook simply
completes it when it lands (and Clerk retries a failing delivery). A webhook that _never_ arrives
(misconfiguration, an endpoint outage past Clerk's retry window) leaves the row in that state
**indefinitely — there is no automated reconciliation in this PR** (a pending decision, §8). The stuck
rows are findable and finishable by an operator:

```sql
-- read-only: deletions started but never marked complete
select id, clerk_user_id, deletion_requested_at
from users
where deletion_requested_at is not null and deleted_at is null
  and deletion_requested_at < now() - interval '1 hour';
```

after confirming in Clerk that the identity no longer exists, the same finalisation as Step 4 is run in one
transaction (`delete from journal_entries where user_id = :id;` then
`update users set deleted_at = coalesce(deleted_at, now()), updated_at = now() where id = :id;`). Running
it against production needs explicit approval, like any production write.

**Can a retry finish the deletion without the webhook?**

- **Failures at Steps 1–3 (identity not yet deleted): yes, fully.** The member is still signed in; a retry
  re-runs every step, including the Clerk deletion and the finalisation, and returns `200`. The webhook
  then arrives for the Clerk deletion and is a no-op.
- **Failure at Step 4 (identity already deleted): only narrowly.** The session token is a Clerk JWT that is
  verified by signature and expiry (`verifyToken`), so for the remaining life of the token the member can
  still authenticate, the retry gets a Clerk `404` (counted as success), re-runs the finalisation and
  returns `200`. Clerk session tokens are short-lived (about a minute by default — this instance's setting
  has **not** been verified, and the real Clerk behaviour is untested, §8), after which the member cannot
  authenticate and only the webhook (or an operator) can finish. Do not rely on the retry for this case.

**How the mobile app knows whether deletion is pending or complete**

| What the app sees                                           | Meaning                                           | What it does / shows                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `200 { status: 'deleted' }`                                 | Complete                                          | "Your account has been closed and your journal deleted", then signs out. The **only** completion message.                                |
| `202 { status: 'pending' }`                                 | Identity gone; local cleanup finishing            | "Deletion in progress… a few minutes", then signs out. Never says deleted.                                                               |
| `502 ACCOUNT_DELETION_PENDING`                              | Started, not finished; still signed in            | "Started but isn't finished… journal no longer accessible… try again"; Profile shows the pending notice and **Finish Deleting Account**. |
| `GET /api/v1/me/account` → `pending` (e.g. after a restart) | A deletion was started and is unfinished          | Same pending notice and action.                                                                                                          |
| Network failure (status 0)                                  | Unknown                                           | "We couldn't confirm that your account was deleted… try again". No claim either way.                                                     |
| `401`                                                       | Session gone (the account may already be deleted) | Treated as signed out.                                                                                                                   |

After a `200` or `202` the member is signed out and cannot query anything, so the app **cannot later tell
"still finishing" from "finished" — and does not need to**, because in both cases the account can no
longer be used. The app therefore never shows a delayed "deletion complete" confirmation for the `202` case.

### Known limitations of account deletion (not hidden)

- **Only the journal is purged.** Closing the account soft-deletes the `users` row (existing behaviour:
  `getAuthUser` then treats the member as gone). Check-ins, practice completions, reflections, saves and
  other member rows are **retained**. A full-erasure policy for those (and any CRM/Flowi record) is a
  decision outside this PR; store review may expect "associated personal data" to be addressed.
- **There is no way to cancel a pending deletion** in this PR. Because the journal is erased at step 2,
  cancelling after that would not bring it back anyway; whether to offer cancel before step 2, or a
  support-assisted reset of `deletion_requested_at`, is a pending decision (§8).
- **An active paid subscription blocks deletion** by design. Billing and Stripe code are untouched.

## 7. Tests

- Unit (run in CI, no database): `journal-validation.test.ts`, `journal-preview.test.ts`,
  `analytics-exclusions.test.ts`, `private-response.test.ts`, `account-deletion.test.ts` (every failure
  stage and retry), `journal-independence.test.ts` (one-module rule, the five HET conditions, parity with
  the app's `CONDITION_NAMES`, recommendation mapping unchanged), `app/api/v1/journal/entries/route.test.ts`
  (including the pending lock on every route), `app/api/v1/me/account/route.test.ts` (including the wording
  members see); mobile `src/lib/account-deletion.test.ts`.
- **Integration on real PostgreSQL** — `lib/journal.integration.test.ts`: authentication; ownership
  isolation and cross-member 404s (drafts and saved); the draft/saved lifecycle; **draft listing** (default
  saved-only, `status=draft` own-drafts-only, drafts never in history or My Journey/milestones); database
  guards; ordering and paging; preview; idempotent create; delete; references; the five HET conditions and
  rejection of recommendation states; **the pending lock on every route**; **each deletion failure stage
  with real database state** (identity failure, purge failure, finalisation failure), **retry completing**,
  a retry **unable to restore** entries, a straggler write removed at completion, atomic rollback of the
  transactional finalisation, the subscription block; and that nothing the member wrote reaches any log.
  **Skipped unless `TNSI_TEST_DATABASE_URL` is set**; refuses the production host. Run:

  ```
  TZ=UTC TNSI_TEST_DATABASE_URL="<isolated database, migrations applied through 0014>" \
    pnpm --filter @tnsi/web exec vitest run src/lib/journal.integration.test.ts
  ```

  The file substitutes its own connection pool (one connection on a single-session local engine such as
  PGlite, the normal pool on a real server) so no repository source is changed for testing.

- **Not covered — see §8:** the real Clerk integration (Clerk is faked); concurrent creates of one id across
  real connections (the single-session local engine cannot interleave); device-level behaviour of the
  Profile screen.

## 8. Release blockers and pending decisions (NONE of these is complete)

**Release blockers**

1. **Web account-deletion experience and public deletion pathway — not built.** The endpoint exists and
   the mobile Profile screen uses it, but there is no website screen, and no public web page describing how
   to delete an account. Google Play requires a web-accessible deletion path; the privacy policy and store
   listings need to point to it. Required before store submission.
2. **Actual Neon backup retention and its deletion implications — not determined.** Deleting rows removes
   them from the live database only; they remain in backups and any point-in-time/branch copies until those
   expire. The real retention window must be read from the Neon plan and documented, and the privacy policy
   must not describe live deletion as immediate erasure from backups.
3. **Caroline/legal approval of the privacy-policy wording — not obtained.** Nothing in
   `apps/web/src/content/legal/privacy.ts` was changed. Journal data handling, retention and the account
   deletion behaviour (including §6's known limitations) need approved wording before release.
4. **Real Clerk integration testing — not done.** All tests fake Clerk. The real `deleteUser` call, its
   error shapes (including the `404` assumption), the `user.deleted` webhook delivery and Clerk's webhook
   retry behaviour must be exercised against a real (non-production) Clerk instance.
5. **Concurrent idempotent-create testing against an isolated Neon database — not done.** The local
   single-session engine cannot interleave connections. Run the creation-race test on an isolated Neon
   database before the migration is approved, as was done for 0013.

**Pending decisions**

- What else is erased on account deletion (check-ins, completions, reflections, saves, CRM/Flowi) — and
  whether the `users` row should be hard-deleted — see §6.
- Whether to add an automated **reconciliation** for deletions stuck in the pending state because a webhook
  never arrived (today it is a documented manual runbook only).
- Whether a member may **cancel** a pending deletion (before the purge), or support resets it.
- Production migration approval, a Neon backup branch first, then deployment — each separately.
- Whether the GA exclusion needs to cover any further paths when the web journal screens are built.

## 9. Open operational notes

The privacy policy, the store privacy forms (App Store "user content", Play Data safety), and the support
procedure for a stuck pending deletion need to be completed alongside the blockers above.
