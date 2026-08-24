import { NextResponse } from 'next/server';
import { FlowiConfigError, FlowiRequestError, upsertFlowiContact } from '@tnsi/integrations';
import { contactFormSchema } from '@/lib/validation';

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

  // organisation/subject/message are validated above (server-side is
  // mandatory) but deliberately not sent to Flowi below — see the
  // "Deliberately NOT supported" note on FlowiUpsertContactInput in
  // packages/integrations/src/flowi.ts for why. The contact itself
  // (name/email) is captured reliably; the enquiry text is not yet wired
  // to a CRM field, since no real Flowi custom-field key/id for it is
  // confirmed anywhere in this repository.
  const { name, email } = result.data;
  const [firstName, ...rest] = name.split(/\s+/);
  const lastName = rest.join(' ') || undefined;

  try {
    await upsertFlowiContact({
      email,
      firstName,
      lastName,
      source: 'TNSI website — contact form',
      tags: ['TNSI Website Contact Form'],
    });

    return NextResponse.json({ submitted: true });
  } catch (error) {
    if (error instanceof FlowiConfigError) {
      return NextResponse.json(
        { error: 'The contact form is not available right now.' },
        { status: 503 },
      );
    }
    if (error instanceof FlowiRequestError) {
      return NextResponse.json(
        { error: 'We could not send your message. Please try again.' },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
