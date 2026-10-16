import { NextResponse } from 'next/server';
import { db } from '@tnsi/db';
import { attemptNow, enqueueCrmEvent, newsletterPayload } from '@/lib/crm-outbox';

export const runtime = 'nodejs';

/** Simple, deliberately permissive format check — Flowi is the real validator. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface NewsletterRequestBody {
  email?: unknown;
}

/**
 * Newsletter signup. Stored in the CRM outbox first and delivered to Flowi with
 * retries, so a CRM outage never loses a signup. `alreadySubscribed` is only
 * known when the first delivery attempt succeeds immediately; otherwise it is
 * reported as false.
 */
export async function POST(request: Request) {
  let body: NewsletterRequestBody;
  try {
    body = (await request.json()) as NewsletterRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  let id: string;
  try {
    id = await enqueueCrmEvent(db, { kind: 'newsletter', email, payload: newsletterPayload() });
  } catch {
    console.error('[newsletter] could not store the signup');
    return NextResponse.json(
      { error: 'We could not process your subscription. Please try again.' },
      { status: 500 },
    );
  }

  const sent = await attemptNow(id).catch(() => null);
  return NextResponse.json({
    subscribed: true,
    alreadySubscribed: sent?.ok === true ? !sent.isNew : false,
  });
}
