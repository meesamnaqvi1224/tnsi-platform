import { NextResponse } from 'next/server';
import { FlowiConfigError, FlowiRequestError, upsertFlowiContact } from '@tnsi/integrations';

/** Simple, deliberately permissive format check — Flowi is the real validator. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface NewsletterRequestBody {
  email?: unknown;
}

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

  try {
    const result = await upsertFlowiContact({
      email,
      source: 'TNSI website — newsletter',
      tags: ['TNSI Website Newsletter'],
    });

    return NextResponse.json({ subscribed: true, alreadySubscribed: !result.isNew });
  } catch (error) {
    if (error instanceof FlowiConfigError) {
      return NextResponse.json(
        { error: 'Newsletter signup is not available right now.' },
        { status: 503 },
      );
    }
    if (error instanceof FlowiRequestError) {
      return NextResponse.json(
        { error: 'We could not process your subscription. Please try again.' },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
