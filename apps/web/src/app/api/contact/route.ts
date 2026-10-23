import { NextResponse } from 'next/server';
import { db } from '@tnsi/db';
import { attemptNow, contactFormPayload, enqueueCrmEvent } from '@/lib/crm-outbox';
import { contactFormSchema } from '@/lib/validation';
import { honeypotTripped, isCrossOrigin, isRateLimited, TOO_MANY_REQUESTS } from '@/lib/form-guard';

export const runtime = 'nodejs';

const SAFE_NAME = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
const SAFE_CODE = /^[A-Z0-9_]{3,32}$/;

/**
 * Why storing failed, in a fixed safe shape: the error's class name and machine code
 * only (e.g. "PostgresError 42P01" for a missing table, "Error ENOTFOUND" for an
 * unreachable host). Never the message, which can echo the connection host or query
 * text, and never any request data. Anything unexpected becomes "UnknownError".
 */
function describeStorageFailure(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'UnknownError';
  const { name, code } = error as { name?: unknown; code?: unknown };
  const safeName = typeof name === 'string' && SAFE_NAME.test(name) ? name : 'UnknownError';
  return typeof code === 'string' && SAFE_CODE.test(code) ? `${safeName} ${code}` : safeName;
}

/**
 * Contact form. The enquiry is stored FIRST, in the CRM outbox, so it is never
 * lost: if Flowi is slow, down or not configured, the visitor still succeeds and
 * the worker delivers it later (see `lib/crm-outbox.ts`). The name, email,
 * organisation, subject and message all reach Flowi (the last three as the
 * "TNSI Website" custom fields).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (isCrossOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  }
  // A filled honeypot is a bot: answer as if it worked, store nothing.
  if (honeypotTripped(body)) {
    return NextResponse.json({ submitted: true });
  }

  const result = contactFormSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Please check the form and try again.',
        fields: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { name, email, organisation, subject, message } = result.data;

  if (await isRateLimited(db, 'contact_form', email)) {
    return NextResponse.json(TOO_MANY_REQUESTS, {
      status: 429,
      headers: { 'Retry-After': '3600' },
    });
  }

  let id: string;
  try {
    id = await enqueueCrmEvent(db, {
      kind: 'contact_form',
      email,
      payload: contactFormPayload({ name, organisation, subject, message }),
    });
  } catch (error) {
    // Not stored: the one case where we must tell the visitor it did not go through.
    console.error(`[contact] could not store the enquiry: ${describeStorageFailure(error)}`);
    return NextResponse.json(
      { error: 'We could not send your message. Please try again.' },
      { status: 500 },
    );
  }

  // Best effort; a failure leaves the stored row for the worker.
  await attemptNow(id).catch(() => undefined);

  return NextResponse.json({ submitted: true });
}
