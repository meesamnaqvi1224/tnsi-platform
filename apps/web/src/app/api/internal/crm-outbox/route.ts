import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { countFailed, failedByCategory, processOutbox } from '@/lib/crm-outbox';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Runs the CRM outbox worker: sends due rows to Flowi with retries (see
 * `lib/crm-outbox.ts`). Called on a schedule - Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>` when that variable is set on the project.
 *
 * Fails closed: with no `CRON_SECRET` configured the route does nothing (503),
 * and a missing or wrong secret is refused (401) before anything is read or sent.
 * The response carries counts only - never an email, payload or provider text.
 */
function authorised(request: Request, secret: string): boolean {
  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }
  if (!authorised(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await processOutbox();
    const failedRows = await countFailed();
    // Counts by failure category only (e.g. "HTTP 401"): enough to see that something
    // needs fixing and what kind, with no personal data and no provider text.
    const failedBy = failedRows > 0 ? await failedByCategory() : {};
    return NextResponse.json({ ...summary, failedRows, failedBy });
  } catch {
    console.error('[crm outbox] worker run failed');
    return NextResponse.json({ error: 'Worker failed' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
