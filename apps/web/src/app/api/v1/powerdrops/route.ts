/**
 * PowerDrops™ library for native mobile — short, practical interventions
 * for a specific moment, conceptually distinct from `/api/v1/practices`
 * (a library to learn and practise over time; see
 * packages/cms/src/schema/documents/powerDrop.ts).
 *
 * Requires an authenticated session. Free vs paid is decided per
 * PowerDrop from its editorial `freeAccess` flag (Sanity), per the approved
 * Regulation Suite™ model: exactly three PowerDrops are designated free,
 * everything else is the paid library. No programme/certification/feature
 * identifier is involved — `contentAccessFor` (`@/lib/membership`) is the
 * single decision.
 *
 * Every PowerDrop is still LISTED (so the library shows what membership
 * includes), but one the member can't open comes back `locked: true` with
 * its card artwork withheld by the server; opening it is refused by the
 * detail and usage routes. While membership is not open (today), nothing is
 * locked.
 */
import { sanityFetch } from '@tnsi/cms/server';
import { POWER_DROPS_LIST_API_QUERY } from '@tnsi/cms';
import { mapPowerDropListItem, type RawPowerDropListItem } from '@/lib/power-drop-api';
import { powerDropsListQuerySchema } from '@/lib/validation';
import { getAuthUser } from '@/lib/auth-api';
import { success, unauthorized, badRequest } from '@/lib/api-response';
import { contentAccessFor } from '@/lib/membership';

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

  const access = contentAccessFor(user.entitlements);
  const items = result?.items ?? [];
  const total = result?.total ?? 0;

  return success({
    powerDrops: items.map((item) =>
      mapPowerDropListItem(item, !access.canOpen({ isFree: item.isFree ?? false })),
    ),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + items.length < total,
    },
  });
}
