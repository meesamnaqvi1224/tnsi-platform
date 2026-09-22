/**
 * Single Somatic Card detail — full structured content (Invitation/
 * Purpose/Description/Orientation/Gentle Note/Anchor, ordered
 * practiceSteps/whatToNotice, all four visual asset types with alt text)
 * for the card-reading screen. Same `requireMemberAccess()` model as the
 * other `/api/v1/somatic-cards*` routes. Reads Postgres only.
 */
import { db, somaticCards, somaticSeries } from '@tnsi/db';
import { eq, and } from 'drizzle-orm';
import { requireMemberAccess, memberAccessErrorResponse } from '@/lib/auth-api';
import { somaticCardSlugParamSchema } from '@/lib/validation';
import { mapSomaticCardDetail, parseSomaticCardJsonbFields } from '@/lib/somatic-card-api';
import { success, badRequest, notFound, internalError } from '@/lib/api-response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ cardSlug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }

  const { cardSlug } = await params;
  const parsed = somaticCardSlugParamSchema.safeParse({ cardSlug });
  if (!parsed.success) {
    return badRequest('Invalid card slug', { errors: parsed.error.flatten().fieldErrors });
  }

  // A single join, not two queries: the Card must be `published` AND its
  // Series must be `published`, enforced together in one WHERE — a Card
  // whose Series is draft/archived (an "orphaned" Card per
  // docs/TNSI_Somatic_Card_Read_API_v1.md §6) never reads as found, without
  // a separate integrity check or N+1 lookup.
  const rows = await db
    .select({ card: somaticCards, series: somaticSeries })
    .from(somaticCards)
    .innerJoin(somaticSeries, eq(somaticCards.seriesId, somaticSeries.id))
    .where(
      and(
        eq(somaticCards.slug, parsed.data.cardSlug),
        eq(somaticCards.status, 'published'),
        eq(somaticSeries.status, 'published'),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return notFound('Card not found');
  }

  // The sync layer validates these JSONB columns before every write (see
  // sync-somatic.ts) — a parse failure here means Postgres holds data this
  // API's contract doesn't recognize, a genuine server-side data-integrity
  // problem, not something this route repairs or partially renders (see
  // docs/TNSI_Somatic_Card_Read_API_v1.md §9).
  const jsonbFields = parseSomaticCardJsonbFields(row.card);
  if (!jsonbFields) {
    console.error('[Somatic Card API] Invalid JSONB content for card', row.card.id);
    return internalError('Card content is invalid');
  }

  return success(mapSomaticCardDetail(row.card, row.series, jsonbFields));
}
