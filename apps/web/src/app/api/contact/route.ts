import { NextResponse } from 'next/server';
import { db } from '@tnsi/db';
import { attemptNow, contactFormPayload, enqueueCrmEvent } from '@/lib/crm-outbox';
import { contactFormSchema } from '@/lib/validation';

export const runtime = 'nodejs';

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

  let id: string;
  try {
    id = await enqueueCrmEvent(db, {
      kind: 'contact_form',
      email,
      payload: contactFormPayload({ name, organisation, subject, message }),
    });
  } catch {
    // Not stored: the one case where we must tell the visitor it did not go through.
    console.error('[contact] could not store the enquiry');
    return NextResponse.json(
      { error: 'We could not send your message. Please try again.' },
      { status: 500 },
    );
  }

  // Best effort; a failure leaves the stored row for the worker.
  await attemptNow(id).catch(() => undefined);

  return NextResponse.json({ submitted: true });
}
