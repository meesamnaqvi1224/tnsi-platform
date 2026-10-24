import type { Entitlements } from '@/api/types';

/**
 * What the Membership screen says about a member's access, as plain text lines.
 * Pure (no React Native), so every state is unit-tested with the rest of the
 * mobile logic.
 *
 * The app only DISPLAYS what the server resolved (`entitlements.membership`,
 * from GET /api/v1/me/entitlements): it never works out eligibility, paid
 * access or dates itself. In particular a free trial is mentioned as available
 * only when the server says `trialAvailable === true`, and the optional fields
 * added for the trial (`trialEndsAt`, `trialExpired`, `trialAvailable`,
 * `paidThrough`, `graceReason`) are all treated as possibly absent, so the
 * screen still works against a server that predates them.
 *
 * There is no purchase and no trial start in the app (store-billing rules; the
 * website handles both), so every call to action points to the TNSI website.
 */

/** "2026-10-14T00:00:00.000Z" -> "14 October 2026"; "" if it is not a real date. */
export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

const TRIAL_ENDED =
  'Your 30-day free trial has ended and your account is a Free account again. Nothing has been charged.';

const TRIAL_AVAILABLE =
  'A 30-day free trial is available for your account. You can start it on the TNSI website. No payment card is required, and nothing is charged when it ends.';

export function membershipDetailLines(entitlements: Entitlements): string[] {
  const { membership } = entitlements;

  if (membership) {
    switch (membership.state) {
      case 'free': {
        const base = membership.contentLocking
          ? 'You have free access to selected practices and PowerDrops™. A membership unlocks the full Regulation Suite™ library.'
          : 'You currently have free access to TNSI.';
        const lines = [base];
        if (membership.trialExpired === true) lines.push(TRIAL_ENDED);
        if (membership.trialAvailable === true) lines.push(TRIAL_AVAILABLE);
        return lines;
      }

      case 'trialing': {
        // The trial end is the server's `trialEndsAt`; an older server only had
        // the billing period end, which for a pre-existing Stripe trial is the same moment.
        const end = formatDay(membership.trialEndsAt ?? entitlements.currentPeriodEnd ?? '');
        const when = end ? `Your free trial runs until ${end}.` : 'Your free trial is active.';
        return [
          `${when} You have full access. No payment card is held and nothing is charged when it ends: your account returns to Free unless you choose a paid plan on the TNSI website.`,
        ];
      }

      case 'grace': {
        const until = membership.graceEndsAt ? formatDay(membership.graceEndsAt) : '';
        if (membership.graceReason === 'renewal_unconfirmed') {
          return [
            until
              ? `We couldn't confirm your latest renewal just now, so your access is being held. This is temporary. It continues until ${until} at the latest.`
              : "We couldn't confirm your latest renewal just now, so your access is being held. This is temporary.",
          ];
        }
        return [
          until
            ? `We couldn't take your latest payment. Your access continues until ${until}. Update your payment method on the website to keep your membership.`
            : "We couldn't take your latest payment. Update your payment method on the website to keep your membership.",
        ];
      }

      case 'inactive':
        return ['Your membership has ended. You can restart it from the TNSI website.'];

      case 'active':
        break;
    }
  }

  if (entitlements.tier === 'free') return ['You currently have free access to TNSI.'];

  const accessEnd = formatDay(membership?.paidThrough ?? entitlements.currentPeriodEnd ?? '');

  if (entitlements.cancelAtPeriodEnd && accessEnd) {
    return [
      `Your access continues until ${accessEnd}, after which your membership will not renew.`,
    ];
  }
  if (entitlements.status === 'active' && accessEnd) {
    return [`Renews ${accessEnd}.`];
  }
  return [];
}
