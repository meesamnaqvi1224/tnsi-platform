/**
 * Somatic Card Series library — the top-level navigation list for the
 * Somatic Card reading experience. Reads Postgres only (`somatic_series`,
 * synced by `sync-somatic.ts` — see docs/TNSI_Somatic_Card_Sync_v1.md);
 * this route never queries Sanity, consistent with the locked
 * architecture ("Sanity → Somatic Sync → Postgres → THIS READ API").
 *
 * `requireMemberAccess()` gate: Somatic Cards are a structured content
 * library members work through over time, the same shape as
 * `/api/v1/practices` (not public marketing content like `/api/v1/articles`,
 * and not the deliberately-deferred-entitlement case `/api/v1/powerdrops`
 * documents) — this exact access-control choice was already reasoned
 * through and locked in the prior approved Schema Design milestone
 * (docs/TNSI_Somatic_Card_Schema_Design_v1.md §10/§14: "mirrors
 * /api/v1/practices and /api/v1/powerdrops list-route shape exactly,
 * including requireMemberAccess() as the first line") and the Architecture
 * Audit ("reusing requireMemberAccess() verbatim"). This route does not
 * make or revisit the commercial free/paid decision — it only applies the
 * existing technical access-control mechanism.
 */
import { db, somaticSeries } from '@tnsi/db';
import { eq, asc } from 'drizzle-orm';
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { mapSomaticSeriesListItem } from '@/lib/somatic-card-api';
import { success } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }

  // Same inline limit/offset convention and `{ limit, offset }` response
  // shape as `/api/v1/practices` (the closest analog — Postgres-backed,
  // requireMemberAccess()-gated), not the `total`/`hasMore` shape used by
  // the Sanity-backed `/api/v1/articles`/`/api/v1/powerdrops` routes. The
  // Core Series is 9 Series total (see
  // docs/TNSI_Somatic_Card_Read_API_v1.md §12) — far under the default
  // limit, so in practice this always returns everything on one page today;
  // the query param exists for consistency with every other list route in
  // this codebase, not because 9 rows need paging.
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = parseInt(searchParams.get('offset') || '0');

  // Only `status = 'published'` — draft/archived Series are never exposed
  // (see docs/TNSI_Somatic_Card_Read_API_v1.md §6). Explicit `sortOrder`
  // ordering per the locked architecture — never createdAt/updatedAt/id.
  const seriesList = await db
    .select()
    .from(somaticSeries)
    .where(eq(somaticSeries.status, 'published'))
    .orderBy(asc(somaticSeries.sortOrder))
    .limit(limit)
    .offset(offset);

  return success({
    series: seriesList.map(mapSomaticSeriesListItem),
    pagination: { limit, offset },
  });
}
