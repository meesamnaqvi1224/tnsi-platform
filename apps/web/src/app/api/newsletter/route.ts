import { NextResponse } from 'next/server';
import { db } from '@tnsi/db';
import { attemptNow, enqueueCrmEvent, newsletterPayload } from '@/lib/crm-outbox';
import { emailSchema } from '@/lib/validation';
import {
  honeypotTripped,
  isBodyTooLarge,
  isCrossOrigin,
  TOO_MANY_REQUESTS,
  withinRateLimit,
} from '@/lib/form-guard';

export const runtime = 'nodejs';

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
  if (isBodyTooLarge(request)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 413 });
  }

  let body: NewsletterRequestBody;
  try {
    body = (await request.json()) as NewsletterRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (isCrossOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  }
  // A filled honeypot is a bot: answer as if it worked, store nothing.
  if (honeypotTripped(body)) {
    return NextResponse.json({ subscribed: true, alreadySubscribed: false });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }
  if (!emailSchema.safeParse(email).success) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  let id: string;
  try {
    // The limit check and the write are one atomic step per email address.
    const stored = await withinRateLimit(db, 'newsletter', email, (executor) =>
      enqueueCrmEvent(executor, { kind: 'newsletter', email, payload: newsletterPayload() }),
    );
    if (stored.limited) {
      return NextResponse.json(TOO_MANY_REQUESTS, {
        status: 429,
        headers: { 'Retry-After': '3600' },
      });
    }
    id = stored.value;
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
