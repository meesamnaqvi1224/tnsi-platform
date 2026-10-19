import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowiRequestError } from '@tnsi/integrations';

/**
 * Real-PostgreSQL tests for the CRM outbox: claiming, retries, giving up,
 * concurrent workers, crashed workers, retention, and atomicity with the
 * visitor's own record. Flowi is a controllable fake (`FakeSender`); this proves
 * our queue behaviour, not Flowi's.
 *
 * SKIPPED unless `TNSI_TEST_DATABASE_URL` is set; never reads `DATABASE_URL`;
 * refuses the production host by content. The target must be an ISOLATED
 * database with the repository's migrations applied (including 0010a):
 *
 *   TNSI_TEST_DATABASE_URL="<isolated database>" \
 *     pnpm --filter @tnsi/web exec vitest run src/lib/crm-outbox.integration.test.ts
 */

const PRODUCTION_DB_HOST = 'ep-damp-flower-ayp7i2gc';
const TEST_URL = process.env.TNSI_TEST_DATABASE_URL;
const RUN = `outbox-it-${Date.now()}`;
const MIN = 60 * 1000;

/**
 * What Node's `AbortSignal.timeout` does with a fractional delay. The real client passes
 * the timeout straight to it, so a fake that accepted any number would hide this failure.
 */
function rejectNonIntegerTimeout(options?: { timeoutMs?: number }) {
  if (options?.timeoutMs !== undefined && !Number.isInteger(options.timeoutMs)) {
    throw Object.assign(
      new RangeError(`The value of "delay" is out of range. Received ${options.timeoutMs}`),
      { code: 'ERR_OUT_OF_RANGE' },
    );
  }
}

/**
 * A fake Flowi: contacts keyed by email, each with a set of tags. `upsert` never
 * changes tags (exactly like the real endpoint when no `tags` field is sent);
 * `addTags` only ever adds. Failures can be queued per step.
 */
// Contact ids are unique across fakes: rows left by earlier tests may carry ids from them.
let contactSeq = 0;

class FakeSender {
  calls: Array<{ email: string; keys: string[] }> = []; // upserts
  tagCalls: Array<{ contactId: string; tags: string[] }> = [];
  upsertPlan: Array<unknown> = [];
  tagPlan: Array<unknown> = [];
  /** When set, EVERY tag call fails with this error. */
  tagAlways: unknown = null;
  upsertDelayMs = 0;
  tagDelayMs = 0;
  /** Behave like a hung Flowi: wait for the caller's timeout, then abort like fetch does. */
  hangUpsert = false;
  hangTags = false;
  /** Flowi ACCEPTS the call and applies it, but the response is lost: the caller sees a timeout. */
  upsertAppliedThenTimeout = false;
  tagsAppliedThenTimeout = false;
  upsertOptions: Array<{ timeoutMs?: number } | undefined> = [];
  tagOptions: Array<{ timeoutMs?: number } | undefined> = [];
  contacts = new Map<string, { id: string; tags: Set<string> }>();
  onSend?: (email: string) => Promise<void>;

  /** Flowi deletes (or merges away) a contact: its id no longer exists. */
  deleteContact(email: string) {
    this.contacts.delete(email);
  }
  seedContact(email: string, tags: string[]) {
    this.contacts.set(email, { id: `contact-${RUN}-${++contactSeq}`, tags: new Set(tags) });
  }
  async upsert(input: { email: string }, options?: { timeoutMs?: number }) {
    rejectNonIntegerTimeout(options);
    this.calls.push({ email: input.email, keys: Object.keys(input) });
    this.upsertOptions.push(options);
    await this.onSend?.(input.email);
    if (this.hangUpsert) {
      await new Promise((r) => setTimeout(r, options?.timeoutMs ?? 8000));
      throw Object.assign(new Error('aborted'), { name: 'TimeoutError' });
    }
    if (this.upsertDelayMs) await new Promise((r) => setTimeout(r, this.upsertDelayMs));
    if (this.upsertAppliedThenTimeout) {
      // The remote write HAPPENS first, then the caller's request times out.
      if (!this.contacts.has(input.email)) {
        this.contacts.set(input.email, {
          id: `contact-${RUN}-${++contactSeq}`,
          tags: new Set<string>(),
        });
      }
      throw Object.assign(new Error('aborted after the remote write'), { name: 'TimeoutError' });
    }
    const next = this.upsertPlan.shift();
    if (next) throw next;
    await new Promise((r) => setTimeout(r, 10));
    const existing = this.contacts.get(input.email);
    if (existing) return { isNew: false, contactId: existing.id };
    const created = { id: `contact-${RUN}-${++contactSeq}`, tags: new Set<string>() };
    this.contacts.set(input.email, created);
    return { isNew: true, contactId: created.id };
  }
  async addTags(contactId: string, tags: string[], options?: { timeoutMs?: number }) {
    rejectNonIntegerTimeout(options);
    this.tagCalls.push({ contactId, tags });
    this.tagOptions.push(options);
    if (this.hangTags) {
      await new Promise((r) => setTimeout(r, options?.timeoutMs ?? 8000));
      throw Object.assign(new Error('aborted'), { name: 'TimeoutError' });
    }
    if (this.tagDelayMs) await new Promise((r) => setTimeout(r, this.tagDelayMs));
    if (this.tagsAppliedThenTimeout) {
      const applied = [...this.contacts.values()].find((c) => c.id === contactId);
      for (const t of tags) applied?.tags.add(t);
      throw Object.assign(new Error('aborted after the remote write'), { name: 'TimeoutError' });
    }
    if (this.tagAlways) throw this.tagAlways;
    const next = this.tagPlan.shift();
    if (next) throw next;
    const contact = [...this.contacts.values()].find((c) => c.id === contactId);
    if (!contact) throw new FlowiRequestError('unknown contact', 404);
    for (const t of tags) contact.tags.add(t);
  }
}
// The real error class, so retry-or-give-up is decided exactly as in production.
const httpError = (status: number) => new FlowiRequestError('provider text with a@b.test', status);

describe.skipIf(!TEST_URL)('CRM outbox against a real database', () => {
  type Mods = {
    db: (typeof import('@tnsi/db'))['db'];
    crmOutbox: (typeof import('@tnsi/db'))['crmOutbox'];
    assessmentSubmissions: (typeof import('@tnsi/db'))['assessmentSubmissions'];
    eq: (typeof import('drizzle-orm'))['eq'];
    like: (typeof import('drizzle-orm'))['like'];
    outbox: typeof import('./crm-outbox');
  };
  let m: Mods;
  let sender: FakeSender;
  const saved: Record<string, string | undefined> = {};

  beforeAll(async () => {
    if (TEST_URL!.includes(PRODUCTION_DB_HOST)) {
      throw new Error('Refusing to run against the production database.');
    }
    saved.DATABASE_URL = process.env.DATABASE_URL;
    process.env.DATABASE_URL = TEST_URL!;
    const dbModule = await import('@tnsi/db');
    const orm = await import('drizzle-orm');
    m = {
      db: dbModule.db,
      crmOutbox: dbModule.crmOutbox,
      assessmentSubmissions: dbModule.assessmentSubmissions,
      eq: orm.eq,
      like: orm.like,
      outbox: await import('./crm-outbox'),
    };
  });

  afterAll(async () => {
    if (m) {
      await m.db.delete(m.crmOutbox).where(m.like(m.crmOutbox.email, `${RUN}%`));
      await m.db
        .delete(m.assessmentSubmissions)
        .where(m.like(m.assessmentSubmissions.email, `${RUN}%`));
    }
    if (saved.DATABASE_URL === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = saved.DATABASE_URL;
  });

  beforeEach(() => {
    sender = new FakeSender();
  });

  let n = 0;
  const email = () => `${RUN}-${++n}@example.test`;
  const enqueue = (
    e = email(),
    kind: 'contact_form' | 'newsletter' | 'assessment' = 'newsletter',
  ) =>
    m.outbox
      .enqueueCrmEvent(m.db, {
        kind,
        email: e,
        payload: { source: 's', tags: ['T'] },
      })
      .then((id) => ({ id, email: e }));
  const rowOf = async (id: string) =>
    (await m.db.select().from(m.crmOutbox).where(m.eq(m.crmOutbox.id, id)))[0]!;
  // Rows get their due time from the database clock (microseconds); `new Date()` is
  // truncated to milliseconds, so the default "now" is nudged forward a few ms.
  const deps = (now: Date = new Date(Date.now() + 5)) => ({ sender, now: () => now });
  /** The worker only sees OUR rows in these tests: other rows may exist in a shared test database. */
  const ours = (summary: { claimed: number }) => summary.claimed;

  it('a successful immediate attempt marks the row sent', async () => {
    const { id } = await enqueue();
    const result = await m.outbox.attemptNow(id, deps());
    expect(result).toMatchObject({ ok: true, isNew: true });
    const row = await rowOf(id);
    expect(row.status).toBe('sent');
    expect(row.sentAt).not.toBeNull();
    expect(row.lockedUntil).toBeNull();
  });

  it('a Flowi outage leaves the row pending with a back-off, and records only the status', async () => {
    const { id } = await enqueue();
    sender.upsertPlan = [httpError(503)];
    const now = new Date();
    const result = await m.outbox.attemptNow(id, deps(now));
    expect(result).toEqual({ ok: false, permanent: false });
    const row = await rowOf(id);
    expect(row.status).toBe('pending');
    expect(row.attempts).toBe(1);
    expect(row.lastError).toBe('HTTP 503');
    expect(row.lastError).not.toContain('a@b.test');
    expect(row.nextAttemptAt.getTime()).toBe(now.getTime() + 2 * MIN);
  });

  it('is not retried before it is due, and is retried after', async () => {
    const { id } = await enqueue();
    sender.upsertPlan = [httpError(500)];
    const t0 = new Date();
    await m.outbox.attemptNow(id, deps(t0));
    sender.calls = [];

    await m.outbox.processOutbox(deps(new Date(t0.getTime() + MIN))); // 1 min: not due yet
    expect(sender.calls.filter((c) => c.email.includes(RUN))).toHaveLength(0);
    expect((await rowOf(id)).status).toBe('pending');

    await m.outbox.processOutbox(deps(new Date(t0.getTime() + 3 * MIN))); // due
    expect(sender.calls.length).toBeGreaterThanOrEqual(1);
    expect((await rowOf(id)).status).toBe('sent');
  });

  it('a permanent rejection (HTTP 422) is not retried: the row is failed at once', async () => {
    const { id } = await enqueue();
    sender.upsertPlan = [httpError(422)];
    expect(await m.outbox.attemptNow(id, deps())).toEqual({ ok: false, permanent: true });
    const row = await rowOf(id);
    expect(row.status).toBe('failed');
    expect(row.lastError).toBe('HTTP 422');

    sender.calls = [];
    await m.outbox.processOutbox(deps(new Date(Date.now() + 24 * 60 * MIN)));
    expect(sender.calls.some((c) => c.email === row.email)).toBe(false);
  });

  it('gives up after the maximum number of attempts', async () => {
    const { id } = await enqueue();
    let t = new Date();
    for (let i = 1; i <= m.outbox.OUTBOX.maxAttempts; i++) {
      sender.upsertPlan = [httpError(503)];
      const r = await m.outbox.attemptNow(id, deps(t));
      expect(r).not.toBeNull();
      t = new Date(t.getTime() + 7 * 60 * 60 * 1000); // past any back-off
    }
    const row = await rowOf(id);
    expect(row.status).toBe('failed');
    expect(row.attempts).toBe(m.outbox.OUTBOX.maxAttempts);
  });

  it('two workers running at once never send the same row twice', async () => {
    const rows = await Promise.all(Array.from({ length: 8 }, () => enqueue()));
    const mine = new Set(rows.map((r) => r.email));

    const [a, b] = await Promise.all([
      m.outbox.processOutbox(deps()),
      m.outbox.processOutbox(deps()),
    ]);

    const counts = new Map<string, number>();
    for (const c of sender.calls)
      if (mine.has(c.email)) counts.set(c.email, (counts.get(c.email) ?? 0) + 1);
    expect([...counts.values()].every((v) => v === 1)).toBe(true);
    expect(counts.size).toBe(8);
    expect(ours(a) + ours(b)).toBeGreaterThanOrEqual(8);
  });

  it('the claim is committed before Flowi is called: no database transaction is held during the send', async () => {
    const { id, email: e } = await enqueue();
    let statusSeenFromAnotherConnection: string | undefined;
    sender.onSend = async (who) => {
      if (who !== e) return;
      // A separate pooled connection reads the row while the send is in progress.
      statusSeenFromAnotherConnection = (await rowOf(id)).status;
    };
    await m.outbox.attemptNow(id, deps());
    expect(statusSeenFromAnotherConnection).toBe('sending');
  });

  it('a live claim is left alone; a crashed worker’s expired claim is taken over', async () => {
    const live = await enqueue();
    const stale = await enqueue();
    const now = new Date();
    await m.db
      .update(m.crmOutbox)
      .set({ status: 'sending', lockedUntil: new Date(now.getTime() + MIN) })
      .where(m.eq(m.crmOutbox.id, live.id));
    await m.db
      .update(m.crmOutbox)
      .set({ status: 'sending', lockedUntil: new Date(now.getTime() - MIN) })
      .where(m.eq(m.crmOutbox.id, stale.id));

    await m.outbox.processOutbox(deps(now));

    expect(sender.calls.some((c) => c.email === live.email)).toBe(false);
    expect(sender.calls.some((c) => c.email === stale.email)).toBe(true);
    expect((await rowOf(live.id)).status).toBe('sending');
    expect((await rowOf(stale.id)).status).toBe('sent');
  });

  it('deletes rows sent long ago and keeps recent ones and unsent ones', async () => {
    const old = await enqueue();
    const recent = await enqueue();
    const waiting = await enqueue();
    const now = new Date();
    const day = 24 * 60 * MIN;
    await m.db
      .update(m.crmOutbox)
      .set({ status: 'sent', sentAt: new Date(now.getTime() - 31 * day) })
      .where(m.eq(m.crmOutbox.id, old.id));
    await m.db
      .update(m.crmOutbox)
      .set({ status: 'sent', sentAt: new Date(now.getTime() - 5 * day) })
      .where(m.eq(m.crmOutbox.id, recent.id));
    await m.db
      .update(m.crmOutbox)
      .set({ nextAttemptAt: new Date(now.getTime() + day) })
      .where(m.eq(m.crmOutbox.id, waiting.id));

    await m.outbox.processOutbox(deps(now));

    const gone = await m.db.select().from(m.crmOutbox).where(m.eq(m.crmOutbox.id, old.id));
    expect(gone).toHaveLength(0);
    expect(await rowOf(recent.id)).toBeDefined();
    expect((await rowOf(waiting.id)).status).toBe('pending');
  });

  it('an assessment and its CRM event are stored together or not at all', async () => {
    const e = email();
    await expect(
      m.db.transaction(async (trx) => {
        await trx.insert(m.assessmentSubmissions).values({
          assessmentSlug: 'capacity-assessment',
          email: e,
          answers: { q1: 1 },
          score: 1,
          resultTier: 'x',
        });
        await m.outbox.enqueueCrmEvent(trx, {
          kind: 'assessment',
          email: e,
          payload: { source: 's', tags: [] },
        });
        throw new Error('something failed after both writes');
      }),
    ).rejects.toThrow();

    expect(
      await m.db
        .select()
        .from(m.assessmentSubmissions)
        .where(m.eq(m.assessmentSubmissions.email, e)),
    ).toHaveLength(0);
    expect(await m.db.select().from(m.crmOutbox).where(m.eq(m.crmOutbox.email, e))).toHaveLength(0);

    // and when nothing fails, both exist
    const ok = email();
    await m.db.transaction(async (trx) => {
      await trx.insert(m.assessmentSubmissions).values({
        assessmentSlug: 'capacity-assessment',
        email: ok,
        answers: { q1: 1 },
        score: 1,
        resultTier: 'x',
      });
      await m.outbox.enqueueCrmEvent(trx, {
        kind: 'assessment',
        email: ok,
        payload: { source: 's', tags: [] },
      });
    });
    expect(
      await m.db
        .select()
        .from(m.assessmentSubmissions)
        .where(m.eq(m.assessmentSubmissions.email, ok)),
    ).toHaveLength(1);
    expect(await m.db.select().from(m.crmOutbox).where(m.eq(m.crmOutbox.email, ok))).toHaveLength(
      1,
    );
  });

  it('running the worker again changes nothing: a delivered row is never sent twice', async () => {
    const { id, email: e } = await enqueue();
    await m.outbox.processOutbox(deps());
    expect((await rowOf(id)).status).toBe('sent');
    const sentOnce = sender.calls.filter((c) => c.email === e).length;
    await m.outbox.processOutbox(deps());
    await m.outbox.processOutbox(deps());
    expect(sender.calls.filter((c) => c.email === e).length).toBe(sentOnce);
    expect(sentOnce).toBe(1);
  });

  describe('two-step delivery: upsert, then add the tag', () => {
    it('upserts without tags, then adds the tag; the row is sent only after both', async () => {
      const { id, email: e } = await enqueue();
      const result = await m.outbox.attemptNow(id, deps());
      expect(result).toMatchObject({ ok: true, isNew: true });
      expect(sender.calls).toHaveLength(1);
      expect(sender.calls[0]!.keys).not.toContain('tags'); // the upsert never carries tags
      expect(sender.tagCalls).toEqual([{ contactId: sender.contacts.get(e)!.id, tags: ['T'] }]);
      const row = await rowOf(id);
      expect(row.status).toBe('sent');
      expect(row.contactId).toBe(sender.contacts.get(e)!.id);
    });

    it('never overwrites a contact’s existing tags: they are all still there afterwards', async () => {
      const { id, email: e } = await enqueue();
      sender.seedContact(e, ['Webinar 2026', 'Buyer']);
      await m.outbox.attemptNow(id, deps());
      expect([...sender.contacts.get(e)!.tags].sort()).toEqual(['Buyer', 'T', 'Webinar 2026']);
    });

    it('an upsert failure adds no tag and saves no contact id', async () => {
      const { id } = await enqueue();
      sender.upsertPlan = [httpError(503)];
      expect(await m.outbox.attemptNow(id, deps())).toEqual({ ok: false, permanent: false });
      expect(sender.tagCalls).toHaveLength(0);
      const row = await rowOf(id);
      expect(row.status).toBe('pending');
      expect(row.contactId).toBeNull();
    });

    it('a tag failure is NOT a completed delivery: the row stays pending with the contact id saved', async () => {
      const { id, email: e } = await enqueue();
      sender.tagPlan = [httpError(503)];
      const t0 = new Date();
      expect(await m.outbox.attemptNow(id, deps(t0))).toEqual({ ok: false, permanent: false });
      const row = await rowOf(id);
      expect(row.status).toBe('pending');
      expect(row.sentAt).toBeNull();
      expect(row.attempts).toBe(1);
      expect(row.lastError).toBe('HTTP 503');
      expect(row.contactId).toBe(sender.contacts.get(e)!.id);
      expect(sender.contacts.get(e)!.tags.has('T')).toBe(false);
    });

    it('the retry after a tag failure only adds the tag: it does not repeat the upsert', async () => {
      const { id, email: e } = await enqueue();
      sender.tagPlan = [httpError(503)];
      const t0 = new Date();
      await m.outbox.attemptNow(id, deps(t0));
      expect(sender.calls.filter((c) => c.email === e)).toHaveLength(1);

      await m.outbox.processOutbox({ ...deps(new Date(t0.getTime() + 3 * MIN)), budgetMs: 60_000 });

      expect(sender.calls.filter((c) => c.email === e)).toHaveLength(1); // no second upsert
      // The failed attempt and the retry (the worker may also deliver other tests' due rows).
      const contactId = sender.contacts.get(e)!.id;
      expect(sender.tagCalls.filter((c) => c.contactId === contactId)).toHaveLength(2);
      expect((await rowOf(id)).status).toBe('sent');
      expect(sender.contacts.get(e)!.tags.has('T')).toBe(true);
    });

    it('repeated submissions with the same email reach ONE contact and keep every tag', async () => {
      const e = email();
      const a = await enqueue(e);
      const b = await m.outbox
        .enqueueCrmEvent(m.db, {
          kind: 'contact_form',
          email: e,
          payload: { source: 's2', tags: ['T2'] },
        })
        .then((id) => ({ id }));
      await m.outbox.attemptNow(a.id, deps());
      await m.outbox.attemptNow(b.id, deps());
      expect(sender.contacts.size).toBe(1);
      expect([...sender.contacts.get(e)!.tags].sort()).toEqual(['T', 'T2']);
      expect((await rowOf(a.id)).status).toBe('sent');
      expect((await rowOf(b.id)).status).toBe('sent');
    });
  });

  describe('failures are bounded, visible and recoverable', () => {
    it.each([401, 403, 404])(
      'HTTP %s is retried a few times, then left failed - not forever',
      async (status) => {
        const { id } = await enqueue();
        let t = new Date();
        for (let i = 1; i <= m.outbox.OUTBOX.maxConfigAttempts; i++) {
          sender.upsertPlan = [httpError(status)];
          await m.outbox.attemptNow(id, deps(t));
          const row = await rowOf(id);
          expect(row.attempts).toBe(i);
          expect(row.status).toBe(i < m.outbox.OUTBOX.maxConfigAttempts ? 'pending' : 'failed');
          t = new Date(t.getTime() + 7 * 60 * MIN);
        }
        expect((await rowOf(id)).lastError).toBe(`HTTP ${status}`);
      },
    );

    it('failed rows are counted by category, with no personal data', async () => {
      const a = await enqueue();
      sender.upsertPlan = [httpError(422)];
      await m.outbox.attemptNow(a.id, deps());
      const byCategory = await m.outbox.failedByCategory();
      expect(byCategory['HTTP 422']).toBeGreaterThanOrEqual(1);
      expect(await m.outbox.countFailed()).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(byCategory)).not.toContain('@');
    });

    it('requeueFailed puts failed rows back once the problem is fixed, deletes nothing, and only touches the chosen category', async () => {
      const unauthorised = await enqueue();
      const rejected = await enqueue();
      const waiting = await enqueue();
      const delivered = await enqueue();
      await m.outbox.attemptNow(delivered.id, deps());
      sender.upsertPlan = [httpError(422)];
      await m.outbox.attemptNow(rejected.id, deps());
      // Fail the "unauthorised" row to the limit.
      let t = new Date();
      for (let i = 0; i < m.outbox.OUTBOX.maxConfigAttempts; i++) {
        sender.upsertPlan = [httpError(401)];
        await m.outbox.attemptNow(unauthorised.id, deps(t));
        t = new Date(t.getTime() + 7 * 60 * MIN);
      }
      expect((await rowOf(unauthorised.id)).status).toBe('failed');
      const before = (
        await m.db
          .select()
          .from(m.crmOutbox)
          .where(m.like(m.crmOutbox.email, `${RUN}%`))
      ).length;

      const count = await m.outbox.requeueFailed({ category: 'HTTP 401' });

      expect(count).toBeGreaterThanOrEqual(1);
      const row = await rowOf(unauthorised.id);
      expect(row.status).toBe('pending');
      expect(row.attempts).toBe(0);
      expect(row.lastError).toBeNull();
      expect((await rowOf(rejected.id)).status).toBe('failed'); // a different category: untouched
      expect((await rowOf(waiting.id)).status).toBe('pending');
      expect((await rowOf(delivered.id)).status).toBe('sent');
      const after = (
        await m.db
          .select()
          .from(m.crmOutbox)
          .where(m.like(m.crmOutbox.email, `${RUN}%`))
      ).length;
      expect(after).toBe(before); // nothing deleted

      // And the recovered row is delivered by the next run.
      await m.outbox.processOutbox({ ...deps(new Date(Date.now() + 5)), budgetMs: 60_000 });
      expect((await rowOf(unauthorised.id)).status).toBe('sent');
    });

    it('a requeued row that already has a contact id only repeats the missing tag step', async () => {
      const { id, email: e } = await enqueue();
      let t = new Date();
      for (let i = 0; i < m.outbox.OUTBOX.maxAttempts; i++) {
        sender.tagPlan = [httpError(503)];
        await m.outbox.attemptNow(id, deps(t));
        t = new Date(t.getTime() + 7 * 60 * MIN);
      }
      expect((await rowOf(id)).status).toBe('failed');
      await m.outbox.requeueFailed({ category: 'HTTP 503' });
      await m.outbox.processOutbox({ ...deps(new Date(Date.now() + 5)), budgetMs: 60_000 });
      expect(sender.calls.filter((c) => c.email === e)).toHaveLength(1);
      expect((await rowOf(id)).status).toBe('sent');
    });
  });

  describe('a saved contact id that Flowi no longer knows (stale)', () => {
    /** Leaves the row pending with a saved contact id, as after a failed tag step. */
    async function rowWithSavedId() {
      const { id, email: e } = await enqueue();
      sender.tagPlan = [httpError(503)];
      const t0 = new Date();
      await m.outbox.attemptNow(id, deps(t0));
      const saved = (await rowOf(id)).contactId;
      expect(saved).toBe(sender.contacts.get(e)!.id);
      return { id, email: e, saved: saved!, t0 };
    }
    const later = (t: Date, minutes: number) => ({
      ...deps(new Date(t.getTime() + minutes * MIN)),
      budgetMs: 60_000,
    });

    it('a 404 when adding tags clears the saved id, keeps the submission, and is never "sent"', async () => {
      const { id, email: e, saved, t0 } = await rowWithSavedId();
      sender.deleteContact(e); // Flowi no longer has that contact

      await m.outbox.processOutbox(later(t0, 3));

      const row = await rowOf(id);
      expect(row.status).toBe('pending'); // scheduled for a retry
      expect(row.contactId).toBeNull(); // the stale id is forgotten
      expect(row.sentAt).toBeNull();
      expect(row.attempts).toBe(2);
      expect(row.lastError).toBe('HTTP 404');
      expect(row.email).toBe(e); // the submission itself is untouched
      expect(row.payload).toMatchObject({ source: 's', tags: ['T'] });
      expect(sender.tagCalls.some((c) => c.contactId === saved)).toBe(true);
    });

    it('the next attempt upserts again, gets a fresh id, and adds the tag', async () => {
      const { id, email: e, saved, t0 } = await rowWithSavedId();
      sender.deleteContact(e);
      await m.outbox.processOutbox(later(t0, 3)); // 404 -> cleared
      const upsertsBefore = sender.calls.filter((c) => c.email === e).length;

      await m.outbox.processOutbox(later(t0, 3 + 5)); // after the back-off

      expect(sender.calls.filter((c) => c.email === e).length).toBe(upsertsBefore + 1);
      const row = await rowOf(id);
      expect(row.status).toBe('sent');
      expect(row.contactId).not.toBe(saved);
      expect(row.contactId).toBe(sender.contacts.get(e)!.id);
      expect(sender.contacts.get(e)!.tags.has('T')).toBe(true);
    });

    it.each([
      ['a temporary 503', () => httpError(503)],
      ['a permission error 403', () => httpError(403)],
      ['a rejected request 422', () => httpError(422)],
      ['a timeout', () => Object.assign(new Error('t'), { name: 'TimeoutError' })],
    ])('%s while adding tags does NOT clear the saved id', async (_label, makeError) => {
      const { id, saved, t0 } = await rowWithSavedId();
      sender.tagPlan = [makeError()];
      await m.outbox.processOutbox(later(t0, 3));
      expect((await rowOf(id)).contactId).toBe(saved);
    });

    it('a 404 from the UPSERT is not a stale-id case (there was no saved id to clear)', async () => {
      const { id } = await enqueue();
      sender.upsertPlan = [httpError(404)];
      await m.outbox.attemptNow(id, deps());
      const row = await rowOf(id);
      expect(row.contactId).toBeNull();
      expect(row.status).toBe('pending');
    });

    it('a 404 on an id this same attempt just obtained does not clear it', async () => {
      const { id, email: e } = await enqueue(); // no saved id yet
      sender.tagPlan = [httpError(404)];
      await m.outbox.attemptNow(id, deps());
      expect((await rowOf(id)).contactId).toBe(sender.contacts.get(e)!.id);
    });

    it('retries stay bounded even if Flowi keeps answering 404: the row ends failed, never looping', async () => {
      const { id, t0 } = await rowWithSavedId(); // attempt 1 used
      sender.tagPlan = [];
      sender.tagAlways = httpError(404);
      for (let i = 1; i <= 10; i++) {
        await m.outbox.processOutbox(later(t0, i * 7 * 60));
      }
      const row = await rowOf(id);
      expect(row.status).toBe('failed');
      expect(row.attempts).toBe(m.outbox.OUTBOX.maxConfigAttempts);
      expect(row.lastError).toBe('HTTP 404');
      // No further Flowi calls once failed.
      const calls = sender.tagCalls.length;
      await m.outbox.processOutbox(later(t0, 99 * 60));
      expect(sender.tagCalls.length).toBe(calls);
      // And the form data is still there for a requeue.
      expect(row.payload).toMatchObject({ tags: ['T'] });
    });

    it('a failed row whose last error was the stale id can be requeued and then recovers', async () => {
      const { id, email: e, t0 } = await rowWithSavedId();
      sender.deleteContact(e);
      // Burn the remaining attempts on stale-id 404s so the row ends failed.
      sender.tagAlways = httpError(404);
      for (let i = 1; i <= 10; i++) await m.outbox.processOutbox(later(t0, i * 7 * 60));
      expect((await rowOf(id)).status).toBe('failed');

      sender.tagAlways = null; // the cause is corrected
      await m.outbox.requeueFailed({ category: 'HTTP 404' });
      await m.outbox.processOutbox(later(t0, 200 * 60));

      expect((await rowOf(id)).status).toBe('sent');
      expect(sender.contacts.get(e)!.tags.has('T')).toBe(true);
    });
  });

  describe('a remote write that succeeded but whose response timed out (ambiguous)', () => {
    it('an upsert accepted by Flowi but timed out: the row stays pending, and the retry reaches the SAME contact (no duplicate)', async () => {
      const { id, email: e } = await enqueue();
      sender.upsertAppliedThenTimeout = true;
      const t0 = new Date();

      const first = await m.outbox.attemptNow(id, deps(t0));

      expect(first).toEqual({ ok: false, permanent: false }); // we cannot know it worked
      let row = await rowOf(id);
      expect(row.status).toBe('pending');
      expect(row.contactId).toBeNull(); // the response (and so the id) was lost
      expect(row.lastError).toBe('TimeoutError'); // a timeout, not a rejection
      const remoteIdAfterFirst = sender.contacts.get(e)!.id; // Flowi did create it
      expect(sender.contacts.size).toBe(1);

      // Later the worker retries: the upsert is repeated and lands on the same contact.
      sender.upsertAppliedThenTimeout = false;
      await m.outbox.processOutbox({ ...deps(new Date(t0.getTime() + 3 * MIN)), budgetMs: 60_000 });

      row = await rowOf(id);
      expect(row.status).toBe('sent');
      expect(row.contactId).toBe(remoteIdAfterFirst); // same contact, not a second one
      expect([...sender.contacts.keys()].filter((k) => k === e)).toHaveLength(1);
      expect(sender.contacts.get(e)!.tags.has('T')).toBe(true);
    });

    it('tags added by Flowi but the response timed out: the retry only re-adds the tag and the result is unchanged', async () => {
      const { id, email: e } = await enqueue();
      sender.tagsAppliedThenTimeout = true;
      const t0 = new Date();

      await m.outbox.attemptNow(id, deps(t0));
      let row = await rowOf(id);
      expect(row.status).toBe('pending'); // not marked delivered on an ambiguous timeout
      expect(row.contactId).toBe(sender.contacts.get(e)!.id); // the id WAS received and is kept
      const tagsAfterFirst = [...sender.contacts.get(e)!.tags].sort();

      sender.tagsAppliedThenTimeout = false;
      const upsertsBefore = sender.calls.filter((c) => c.email === e).length;
      await m.outbox.processOutbox({ ...deps(new Date(t0.getTime() + 3 * MIN)), budgetMs: 60_000 });

      row = await rowOf(id);
      expect(row.status).toBe('sent');
      expect(sender.calls.filter((c) => c.email === e).length).toBe(upsertsBefore); // no second upsert
      expect([...sender.contacts.get(e)!.tags].sort()).toEqual(tagsAfterFirst); // adding again changed nothing
    });
  });

  describe('the immediate attempt is short and never loses the submission', () => {
    const quick = (extra: Record<string, unknown> = {}) => ({
      sender,
      now: () => new Date(Date.now() + 5),
      immediateBudgetMs: 150,
      ...extra,
    });

    it('delivers on the immediate attempt even when the clock is fractional (regression: RangeError)', async () => {
      const { id, email: e } = await enqueue();
      let tick = 0;
      const fractionalClock = () => (tick += 0.37); // like performance.now(): never a whole number

      const result = await m.outbox.attemptNow(id, {
        sender,
        now: () => new Date(Date.now() + 5),
        clockMs: fractionalClock,
      });

      expect(result).toMatchObject({ ok: true });
      const row = await rowOf(id);
      expect(row.status).toBe('sent'); // used to stay pending with last_error "RangeError"
      expect(row.lastError).toBeNull();
      expect(sender.contacts.get(e)!.tags.has('T')).toBe(true);
      for (const o of [...sender.upsertOptions, ...sender.tagOptions]) {
        expect(Number.isInteger(o!.timeoutMs)).toBe(true);
      }
    });

    it('passes a short timeout, not the 8 s default, to the upsert', async () => {
      const { id } = await enqueue();
      await m.outbox.attemptNow(id, { sender, now: () => new Date(Date.now() + 5) });
      expect(sender.upsertOptions[0]!.timeoutMs).toBeLessThanOrEqual(3000);
      expect(sender.tagOptions[0]!.timeoutMs).toBeLessThanOrEqual(3000);
    });

    it('a hung Flowi ends the attempt within the budget, and the row stays saved and retryable', async () => {
      const { id, email: e } = await enqueue();
      sender.hangUpsert = true;
      const started = Date.now();
      const result = await m.outbox.attemptNow(id, quick());
      expect(Date.now() - started).toBeLessThan(1000); // nowhere near the old 16 s
      expect(result).toEqual({ ok: false, permanent: false });

      const row = await rowOf(id);
      expect(row.status).toBe('pending');
      expect(row.attempts).toBe(1);
      expect(row.lastError).toBe('TimeoutError');
      expect(row.email).toBe(e);
      expect(row.payload).toMatchObject({ source: 's', tags: ['T'] });

      // Still eligible: once Flowi answers, the worker delivers it.
      sender.hangUpsert = false;
      await m.outbox.processOutbox({ ...deps(new Date(Date.now() + 3 * MIN)), budgetMs: 60_000 });
      expect((await rowOf(id)).status).toBe('sent');
    });

    it('the two calls share ONE budget: the tag call gets only what the upsert left', async () => {
      const { id } = await enqueue();
      sender.upsertDelayMs = 80;
      sender.hangTags = true;
      await m.outbox.attemptNow(id, quick());
      const tagTimeout = sender.tagOptions[0]!.timeoutMs!;
      expect(tagTimeout).toBeLessThan(150);
      expect(tagTimeout).toBeLessThanOrEqual(150 - 80 + 15);
      const row = await rowOf(id);
      expect(row.status).toBe('pending');
      expect(row.contactId).not.toBeNull(); // the retry will only add the tag
    });

    it('if the budget is used up by the upsert, the tag call is not even started', async () => {
      const { id, email: e } = await enqueue();
      sender.upsertDelayMs = 200; // longer than the 150 ms budget, but it succeeds
      await m.outbox.attemptNow(id, quick());
      expect(sender.tagCalls).toHaveLength(0);
      const row = await rowOf(id);
      expect(row.status).toBe('pending'); // not delivered
      expect(row.contactId).toBe(sender.contacts.get(e)!.id);
    });
  });

  describe('worker time budget', () => {
    it('stops claiming new rows once the budget is used, leaving nothing half-claimed', async () => {
      const rows = await Promise.all(Array.from({ length: 6 }, () => enqueue()));
      // Make ours the oldest due rows, so this run picks them first.
      for (const [i, r] of rows.entries()) {
        await m.db
          .update(m.crmOutbox)
          .set({ nextAttemptAt: new Date(i) })
          .where(m.eq(m.crmOutbox.id, r.id));
      }
      let t = 0;
      const clockMs = () => (t += 15_000); // every check "costs" 15 s

      const summary = await m.outbox.processOutbox({ ...deps(), clockMs, budgetMs: 40_000 });

      expect(summary.stoppedForTime).toBe(true);
      expect(summary.claimed).toBe(2); // checks at 15 s and 30 s pass, the one at 45 s stops
      const statuses = await Promise.all(rows.map(async (r) => (await rowOf(r.id)).status));
      expect(statuses.filter((x) => x === 'sent')).toHaveLength(2);
      expect(statuses.filter((x) => x === 'pending')).toHaveLength(4);
      expect(statuses).not.toContain('sending');

      // The next run carries on with the rest.
      const next = await m.outbox.processOutbox({ ...deps(), budgetMs: 60_000 });
      expect(next.stoppedForTime).toBe(false);
      const after = await Promise.all(rows.map(async (r) => (await rowOf(r.id)).status));
      expect(after.every((x) => x === 'sent')).toBe(true);
    });
  });

  it('attemptNow does nothing for a row that is not due or is already claimed', async () => {
    const { id } = await enqueue();
    await m.db
      .update(m.crmOutbox)
      .set({ status: 'sending', lockedUntil: new Date(Date.now() + MIN) })
      .where(m.eq(m.crmOutbox.id, id));
    expect(await m.outbox.attemptNow(id, deps())).toBeNull();
    expect(sender.calls).toHaveLength(0);
    void vi;
  });
});
