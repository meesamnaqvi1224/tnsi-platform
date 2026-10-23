import { and, count, eq, gt, sql } from 'drizzle-orm';
import { crmOutbox } from '@tnsi/db';

/**
 * Abuse protections shared by the public forms (contact, newsletter, assessment).
 * They use only what the app already has - no new service and no new table:
 *
 * - a same-origin check on the Origin header (a request from another site is refused);
 * - a honeypot field real visitors never see or fill - a filled one is a bot;
 * - a rate limit counted from the CRM outbox rows the forms already write
 *   (per email address, and per form overall).
 *
 * None of this replaces email verification (see docs/09-launch-checklist.md): it
 * makes casual abuse expensive and keeps the database and CRM from being flooded.
 */

import { HONEYPOT_FIELD } from '@/lib/form-guard-constants';

export { HONEYPOT_FIELD };

export const FORM_LIMITS = {
  /** Submissions from one email address for one form. */
  perEmail: { max: 5, windowMs: 60 * 60 * 1000 },
  /** Submissions to one form from anyone: a flood guard for the database and the CRM. */
  perForm: { max: 300, windowMs: 10 * 60 * 1000 },
} as const;

/**
 * True when the browser says the request came from a different site. A missing
 * Origin (non-browser callers) is not treated as hostile; only a mismatch is.
 */
export function isCrossOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true; // an Origin that is not a URL
  }
}

/** True when the hidden field was filled in: the submitter is a bot. */
export function honeypotTripped(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const value = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof value === 'string'
    ? value.trim().length > 0
    : value !== undefined && value !== null;
}

type Counter = {
  select: (fields: { n: ReturnType<typeof count> }) => {
    from: (table: typeof crmOutbox) => { where: (condition: unknown) => Promise<{ n: number }[]> };
  };
};

/**
 * Whether this email address, or the form as a whole, has hit its limit. Fails
 * OPEN: if the check itself errors, a real visitor is not turned away by a
 * limiter fault (the submission still goes through the normal storage path).
 */
export async function isRateLimited(
  db: unknown,
  kind: 'contact_form' | 'newsletter' | 'assessment',
  email: string,
  now: Date = new Date(),
): Promise<boolean> {
  try {
    const counter = db as Counter;
    const since = (windowMs: number) => new Date(now.getTime() - windowMs);

    const [byEmail] = await counter
      .select({ n: count() })
      .from(crmOutbox)
      .where(
        and(
          eq(crmOutbox.kind, kind),
          sql`lower(${crmOutbox.email}) = ${email.trim().toLowerCase()}`,
          gt(crmOutbox.createdAt, since(FORM_LIMITS.perEmail.windowMs)),
        ),
      );
    if ((byEmail?.n ?? 0) >= FORM_LIMITS.perEmail.max) return true;

    const [byForm] = await counter
      .select({ n: count() })
      .from(crmOutbox)
      .where(
        and(eq(crmOutbox.kind, kind), gt(crmOutbox.createdAt, since(FORM_LIMITS.perForm.windowMs))),
      );
    return (byForm?.n ?? 0) >= FORM_LIMITS.perForm.max;
  } catch {
    return false;
  }
}

export const TOO_MANY_REQUESTS = {
  error: 'Too many requests. Please wait a while and try again.',
} as const;
