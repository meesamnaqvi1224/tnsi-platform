/**
 * Single published PowerDrop by slug for the native mobile detail screen.
 * Same authenticated-only model as `GET /api/v1/powerdrops` — see that
 * route's header comment for why this isn't gated by a specific
 * membership entitlement. Membership entitlement gating is deferred until
 * a canonical PowerDrops entitlement/product identifier exists.
 */
import { sanityFetch } from '@tnsi/cms/server';
import { POWER_DROP_API_BY_SLUG_QUERY } from '@tnsi/cms';
import { mapPowerDropDetail, type RawPowerDropDetail } from '@/lib/power-drop-api';
import { powerDropSlugParamSchema } from '@/lib/validation';
import { getAuthUser } from '@/lib/auth-api';
import { success, unauthorized, badRequest, notFound } from '@/lib/api-response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { slug: rawSlug } = await params;

  const parsed = powerDropSlugParamSchema.safeParse({ slug: rawSlug });
  if (!parsed.success) {
    return badRequest('Invalid slug', { errors: parsed.error.flatten().fieldErrors });
  }

  // sanityFetch() returns null both when the slug doesn't match a
  // published PowerDrop and when the query itself fails — both read as
  // "not found" here, never exposing draft/unpublished content.
  const powerDrop = await sanityFetch<RawPowerDropDetail>(POWER_DROP_API_BY_SLUG_QUERY, {
    slug: parsed.data.slug,
  });

  if (!powerDrop) {
    return notFound('PowerDrop not found');
  }

  return success(mapPowerDropDetail(powerDrop));
}
