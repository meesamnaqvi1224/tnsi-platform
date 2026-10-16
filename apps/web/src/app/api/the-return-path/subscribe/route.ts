import { NextResponse } from 'next/server';
import {
  addFlowiContactTags,
  FlowiConfigError,
  FlowiRequestError,
  upsertFlowiContact,
} from '@tnsi/integrations';

/**
 * Email capture at the end of The Return Path's public page. Same Flowi
 * path as /api/newsletter (server-side only - the Flowi key never reaches
 * the browser), tagged "The Return Path" so Flowi can send the printable
 * and its follow-up sequence. The client shows success only after this
 * returns 200, i.e. after Flowi has confirmed the contact.
 *
 * Consent must be explicitly true: the form's checkbox is unticked by
 * default and required, and this route doesn't trust the client to have
 * enforced that.
 */
const RETURN_PATH_FLOWI_TAG = 'The Return Path';
const SOURCE = 'TNSI website — The Return Path';

/** Simple, deliberately permissive format check — Flowi is the real validator. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

interface SubscribeRequestBody {
  email?: unknown;
  consent?: unknown;
}

export async function POST(request: Request) {
  let body: SubscribeRequestBody;
  try {
    body = (await request.json()) as SubscribeRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: 'Consent is required.' }, { status: 400 });
  }

  try {
    const result = await upsertFlowiContact({ email, source: SOURCE });
    // Added, never sent with the upsert: an upsert's `tags` would REPLACE the
    // contact's existing tags. The sequence keys on this tag, so a failure to add
    // it is reported (the visitor is not told they are signed up).
    await addFlowiContactTags(result.contactId, [RETURN_PATH_FLOWI_TAG]);
    return NextResponse.json({ subscribed: true, alreadySubscribed: !result.isNew });
  } catch (error) {
    if (error instanceof FlowiConfigError) {
      return NextResponse.json(
        { error: 'Email signup is not available right now.' },
        { status: 503 },
      );
    }
    if (error instanceof FlowiRequestError) {
      return NextResponse.json({ error: 'We could not save your email.' }, { status: 502 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
