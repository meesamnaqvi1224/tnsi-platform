/**
 * Records that the authenticated member used a PowerDrop — a lightweight
 * usage event, deliberately separate from `practice_completions` (a
 * PowerDrop is not a Practice; see
 * packages/db/src/schema/power-drop-usages.ts). No streaks, points, or
 * "percentage complete" — the same PowerDrop can be used again later, and
 * each use is its own row. `userId` is always the authenticated caller's
 * own internal id from `getAuthUser()`, never trusted from the request.
 * Same authenticated-only model as `GET /api/v1/powerdrops` — membership
 * entitlement gating is deferred until a canonical PowerDrops
 * entitlement/product identifier exists.
 */
import { db, powerDropUsages } from '@tnsi/db';
import { sanityFetch } from '@tnsi/cms/server';
import { POWER_DROP_API_BY_SLUG_QUERY } from '@tnsi/cms';
import type { RawPowerDropDetail } from '@/lib/power-drop-api';
import { powerDropSlugParamSchema } from '@/lib/validation';
import { getAuthUser } from '@/lib/auth-api';
import { success, unauthorized, badRequest, notFound } from '@/lib/api-response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { slug: rawSlug } = await params;

  const parsed = powerDropSlugParamSchema.safeParse({ slug: rawSlug });
  if (!parsed.success) {
    return badRequest('Invalid slug', { errors: parsed.error.flatten().fieldErrors });
  }
  const slug = parsed.data.slug;

  // Confirm the slug refers to a real, currently-published PowerDrop
  // before recording a usage event against it — the same "not found"
  // treatment as GET /api/v1/powerdrops/[slug] for an unmatched or
  // unpublished slug.
  const powerDrop = await sanityFetch<RawPowerDropDetail>(POWER_DROP_API_BY_SLUG_QUERY, { slug });
  if (!powerDrop) {
    return notFound('PowerDrop not found');
  }

  const [usage] = await db
    .insert(powerDropUsages)
    .values({
      userId: user.id,
      // Sanity's own document `_id`, not the slug - stays valid even if
      // this PowerDrop is later renamed/re-slugged (see
      // packages/db/src/schema/power-drop-usages.ts).
      powerDropId: powerDrop.id,
      powerDropSlug: slug,
    })
    .returning();

  if (!usage) {
    throw new Error('Insert into power_drop_usages did not return a row');
  }

  return success(
    {
      id: usage.id,
      powerDropId: usage.powerDropId,
      powerDropSlug: usage.powerDropSlug,
      usedAt: usage.usedAt,
    },
    201,
  );
}
