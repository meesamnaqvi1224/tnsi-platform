/**
 * PowerDrops™ library for native mobile — short, practical interventions
 * for a specific moment, conceptually distinct from `/api/v1/practices`
 * (a library to learn and practise over time; see
 * packages/cms/src/schema/documents/powerDrop.ts).
 *
 * Requires an authenticated session (same `getAuthUser()` gate as
 * `/api/v1/practices`), not a specific membership entitlement. A real
 * entitlement gate exists (`requireEntitlement()`,
 * `packages/auth/src/authorize/entitlements.ts`) but no PowerDrops
 * programme/certification/feature identifier is established anywhere in
 * the product yet — inventing one here would be a guess this phase is
 * explicitly not allowed to make (see the Phase 11.3 implementation
 * report's "Access Control" section). Authenticated-only is the safe,
 * reversible default until that identifier is decided.
 *
 * Membership entitlement gating is deferred until a canonical PowerDrops
 * entitlement/product identifier exists.
 */
import { sanityFetch } from '@tnsi/cms/server';
import { POWER_DROPS_LIST_API_QUERY } from '@tnsi/cms';
import { mapPowerDropListItem, type RawPowerDropListItem } from '@/lib/power-drop-api';
import { powerDropsListQuerySchema } from '@/lib/validation';
import { getAuthUser } from '@/lib/auth-api';
import { success, unauthorized, badRequest } from '@/lib/api-response';

export const runtime = 'nodejs';

interface PowerDropsListQueryResult {
  items: RawPowerDropListItem[];
  total: number;
}

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);

  const parsed = powerDropsListQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    featured: searchParams.get('featured') ?? undefined,
  });
  if (!parsed.success) {
    return badRequest('Invalid query parameters', { errors: parsed.error.flatten().fieldErrors });
  }
  const { limit, offset, category, featured } = parsed.data;

  // sanityFetch() never throws — a CMS misconfiguration or a genuine
  // fetch failure both surface here as `null`, treated as an empty
  // library rather than an error (same fallback as /api/v1/articles).
  const result = await sanityFetch<PowerDropsListQueryResult>(POWER_DROPS_LIST_API_QUERY, {
    offset,
    end: offset + limit,
    category: category ?? '',
    featuredOnly: featured === 'true',
  });

  const items = result?.items ?? [];
  const total = result?.total ?? 0;

  return success({
    powerDrops: items.map(mapPowerDropListItem),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + items.length < total,
    },
  });
}
