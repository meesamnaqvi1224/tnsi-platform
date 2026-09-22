/**
 * Single Somatic Card Series, with its ordered published Cards — the
 * Series-navigation detail screen (Series metadata + the card list a
 * member picks from). Same `requireMemberAccess()` model as
 * `GET /api/v1/somatic-cards/series` (see that route's header comment for
 * the access-control reasoning). Reads Postgres only.
 *
 * Each Card in the response is a summary (identity + presentation only —
 * see `mapSomaticCardSummary`), not the full structured content; full
 * content is `GET /api/v1/somatic-cards/[cardSlug]`. This keeps the
 * Series-detail payload proportional to a navigation/listing screen's
 * actual needs rather than embedding every Card's full practiceSteps/
 * whatToNotice/supportingImages/demonstrationSequence up front.
 */
import { db, somaticSeries, somaticCards } from '@tnsi/db';
import { eq, and, asc } from 'drizzle-orm';
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { somaticSeriesSlugParamSchema } from '@/lib/validation';
import { mapSomaticSeriesDetail } from '@/lib/somatic-card-api';
import { success, badRequest, notFound } from '@/lib/api-response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ seriesSlug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }

  const { seriesSlug } = await params;
  const parsed = somaticSeriesSlugParamSchema.safeParse({ seriesSlug });
  if (!parsed.success) {
    return badRequest('Invalid series slug', { errors: parsed.error.flatten().fieldErrors });
  }

  // Only a `published` Series is ever looked up by slug here — a
  // draft/archived Series slug reads as 404, identical to how
  // `/api/v1/powerdrops/[slug]` never leaks unpublished content (see
  // docs/TNSI_Somatic_Card_Read_API_v1.md §6).
  const seriesRows = await db
    .select()
    .from(somaticSeries)
    .where(
      and(eq(somaticSeries.slug, parsed.data.seriesSlug), eq(somaticSeries.status, 'published')),
    )
    .limit(1);

  const series = seriesRows[0];
  if (!series) {
    return notFound('Series not found');
  }

  // Only this Series' `published` Cards, explicit `sortOrder` ordering —
  // never createdAt/updatedAt/id (see docs/TNSI_Somatic_Card_Read_API_v1.md
  // §7). The Series row above was already filtered to `published`, so
  // every Card returned here is guaranteed to belong to a valid, published
  // Series by construction — no separate integrity check needed.
  const cards = await db
    .select()
    .from(somaticCards)
    .where(and(eq(somaticCards.seriesId, series.id), eq(somaticCards.status, 'published')))
    .orderBy(asc(somaticCards.sortOrder));

  return success(mapSomaticSeriesDetail(series, cards));
}
