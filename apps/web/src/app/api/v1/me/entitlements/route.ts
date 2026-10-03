import { getAuthUser } from '@/lib/auth-api';
import { success, unauthorized } from '@/lib/api-response';
import { contentAccessFor } from '@/lib/membership';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  // The resolved membership (free / trialing / active / grace / inactive),
  // computed server-side by the same function every access check uses, so
  // the mobile app displays exactly what the server enforces and never
  // derives paid access from `tier`/`status` itself. `contentLocking` says
  // whether free/paid locking is in force at all (membership open).
  const access = contentAccessFor(user.entitlements);
  const membership = {
    state: access.membership.state,
    hasPaidAccess: access.membership.hasPaidAccess,
    graceEndsAt: access.membership.graceEndsAt,
    cancelsAtPeriodEnd: access.membership.cancelsAtPeriodEnd,
    contentLocking: access.gatingActive,
  };

  if (!user.entitlements) {
    return success({
      tier: 'free',
      status: 'active',
      programs: [],
      certifications: [],
      features: [],
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      membership,
    });
  }

  // Explicit allowlist, not a destructure-exclude — the member-facing
  // shape this response has always documented (see mobile's `Entitlements`
  // type, apps/mobile/src/api/types.ts) never included
  // `stripeCustomerId`/`stripeSubscriptionId`/`userId`/`metadata`/
  // `currentPeriodStart`/`createdAt`/`updatedAt`; the previous
  // destructure-exclude let the first two leak into the actual response
  // body regardless, since they weren't in the exclusion list. An
  // allowlist can't silently start leaking a newly-added column the same
  // way.
  const {
    tier,
    status,
    programs,
    certifications,
    features,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    canceledAt,
  } = user.entitlements;

  return success({
    tier,
    status,
    programs,
    certifications,
    features,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    canceledAt,
    membership,
  });
}
