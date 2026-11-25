# Check-in timezones: implementation plan

Status: **plan only. No code is written and nothing is applied.** Phase 1 is independent of migration
0013 (`docs/multiple-daily-check-ins-migration.md`); Phase 2 needs a separate approval after Phase 1 is
verified.

## Decisions already made

- TNSI will eventually use each member's **local calendar day**, not the server's UTC day.
- It ships in two phases. Phase 1 only records timezone information and keeps today's UTC-based
  behaviour exactly as it is. Phase 2 switches the behaviour.
- Historical check-ins keep their existing dates. Timezone information that was never captured is
  never reconstructed.
- Use the existing `check_ins.metadata` jsonb for Phase 1 unless there is a strong technical reason
  not to. (There is not; see "Why `metadata`" below.)

## Phase 1: record the member's timezone (no behaviour change)

### What is recorded
On every new check-in, in `check_ins.metadata`:

```json
{ "timeZone": "Europe/London", "localDate": "2026-11-09", "utcOffsetMinutes": 0 }
```

| Field | Source | Why |
| --- | --- | --- |
| `timeZone` | sent by the client, then **validated** server-side | The IANA zone the member's device reported at check-in time. |
| `localDate` | **computed by the server** from `completedAt` and `timeZone` | What the member's calendar said at that moment. Never trusted from the client. Lets us measure, before Phase 2, how often the UTC day differs from the member's day. |
| `utcOffsetMinutes` | computed by the server (DST-aware, for that instant) | An audit trail of the offset that applied then. |

If the client sends no timezone (older app builds, or an invalid value) none of the three keys are
written, and the check-in is still saved normally. Missing means unknown, never guessed.

### Why `metadata`, not a column
- The column already exists (`jsonb NOT NULL DEFAULT '{}'`), so **no schema change and no migration**:
  Phase 1 can ship without a database approval and without waiting for 0013.
- Nothing needs to query or index on the timezone yet. Phase 2's behaviour uses the stored
  `completed_date`, not the metadata.
- If Phase 2 needs to filter or constrain on it, promoting it to a typed column later is a simple
  additive migration, and the metadata values can be copied across. Reasons that would justify a column
  now (a unique index, frequent filtering) do not apply yet.

### Transport
- `POST /api/v1/check-ins` accepts an optional `timeZone` string in the body. A body field was chosen
  over a header because it travels with the record it describes. (Phase 2 will also need the zone on
  `GET /api/v1/today`; that is a header or query parameter and belongs to Phase 2.)
- Mobile (`CheckInCard`) sends `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Web (`check-in-form.tsx`) sends the same from the browser.
- Add `timeZone?: string` to `checkInSchema` and to the mobile `CheckInInput` type. Older clients that
  omit it keep working.

### Validation (`validateTimeZone`, one shared function)
1. Must be a string of at most 64 characters matching an IANA shape (`Area/Location`, with optional
   third segment, or `UTC`). Anything else is rejected.
2. Must be accepted by `new Intl.DateTimeFormat('en-US', { timeZone })` (the runtime's own IANA
   database), otherwise rejected.
3. Returns the canonical name (`resolvedOptions().timeZone`), so aliases such as `Asia/Calcutta` are
   stored consistently.
4. **An invalid timezone never blocks a check-in.** The value is dropped, the check-in is saved without
   timezone metadata, and the rejection is logged (zone value only, no member data). A check-in is
   worth more than the timezone.

### What must NOT change in Phase 1
- `completed_date` is still the server's calendar day, computed exactly as today.
- "Checked in today", the recommendation, `/api/v1/today`, history order and all progress indicators
  behave as before. A test pins this: the same instant with different `timeZone` values produces the
  same `completed_date`.
- No existing row is read, rewritten or backfilled.

### Interaction with migration 0013
Independent in schema; they meet only in code. On `main` the POST route inserts directly. In PR #48 the
write moves into `recordCheckIn`. Plan: add an optional `metadata` argument to `recordCheckIn` in #48 and
let both the primary and additional inserts carry it. Recommended order: **ship Phase 1 first** (no
migration, no approval beyond a normal merge), so data starts accumulating; then rebase #48 over it.
Phase 1 also works unchanged if #48 goes first.

### Privacy
A timezone is coarse location data. It is stored only inside the member's own check-in record, follows
the same retention and deletion (cascade on account deletion) as the check-in, and is never returned by
the API (`metadata` is already excluded from the check-in response). It should be added to the privacy
policy's description of what a check-in stores: **a wording decision for Caroline / legal**.

### Tests (all runnable without a database)
- `validateTimeZone`: valid zones, `UTC`, an alias, an unknown zone, a too-long string, wrong shape,
  injection-style input, non-strings.
- `localDateIn(instant, timeZone)`: 23:30 UTC on a given day in `Pacific/Kiritimati` (+14), `Asia/Kolkata`
  (+5:30), `America/Los_Angeles` and `Pacific/Pago_Pago` (-11), the exact DST transition instants for
  `Europe/London` and `America/New_York` (both clock changes), and a leap day.
- POST route: valid zone is stored with the three keys; invalid or missing zone saves the check-in
  without them; `completed_date` is identical with and without a zone.
- Clients: the payload includes `timeZone` (mobile and web).

### Rollout and measuring
1. Merge Phase 1 (additive, no migration).
2. After a period of real use, this read-only query reports how many members the UTC day currently
   misplaces, which is the case for Phase 2:

```sql
SELECT count(*) FILTER (WHERE metadata ? 'timeZone')                                   AS with_timezone,
       count(*) FILTER (WHERE metadata ? 'timeZone'
                          AND metadata->>'localDate' <> completed_date::text)          AS utc_day_differs
FROM check_ins WHERE created_at > <phase 1 release time>;
```

3. Verify on the isolated test database first, then in production after approval.

## Phase 2 outline (not started; needs its own approval)

Local calendar day determines the primary check-in, additional check-ins, "checked in today", the
daily recommendation, `/api/v1/today` and daily progress indicators.

- **Which zone applies:** the zone sent with the request (check-in and `/today`), not a stored profile
  setting. If a request carries none, fall back to the zone on the member's most recent check-in, then
  to UTC.
- **How the day is decided:** by comparing dates (`completed_date` set to the member's local date at
  write time), never by adding 24 hours or by time windows. This is also how DST is handled: a local
  day can be 23 or 25 hours long and the date comparison does not care. `/today` must match on
  `completed_date`, replacing its current `completedAt` window.
- **Travel:** the day is judged in the zone the member is in at the moment of the check-in, and that
  zone is stored on each check-in, so history stays stable. Flying west can place a member on a date
  they already checked in on; flying east can skip a date. The primary/additional rule from 0013 already
  handles the first (the later check-in becomes additional), and a skipped date is simply a day with no
  check-in. Behaviour is deterministic and explainable, if occasionally surprising.
- **Switchover day:** rows written before Phase 2 keep their UTC-based dates. On the first local day
  after switchover, a member's earlier UTC-dated row may occupy the same date as their new local one;
  the transition needs an explicit rule (a cutoff timestamp, so only rows written after it count as
  member-local). To be specified and tested before Phase 2 is approved.
- **Clients:** replace the date-string comparisons that assume the server's day (for example mobile
  `WeekAtAGlance`'s `toISOString().slice(0, 10)`, wrong for users east of UTC) with comparisons on the
  server-provided local `completedDate`; web server pages need the zone via cookie or setting.
- **Data:** likely no new table. A typed column is an option if filtering on timezone becomes common.
- **Not done in Phase 2:** no backfill of historical rows, ever.

## Open items
- Privacy wording for the check-in timezone (Caroline / legal).
- Phase 2 switchover rule and its approval, after Phase 1 data is in.
- Rehearsal of migration 0013 on the isolated Neon database is separate and pending the test database
  configuration.
