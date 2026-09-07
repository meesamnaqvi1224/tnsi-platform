/**
 * Public single-article read for the native mobile Resources detail
 * screen. Same public, unauthenticated model as `GET /api/v1/articles`
 * (see that route's header comment) - the Sanity `article` schema has no
 * entitlement/gating field, and the web article page requires no Clerk
 * session either.
 */
import { sanityFetch } from '@tnsi/cms/server';
import { ARTICLE_API_BY_SLUG_QUERY } from '@tnsi/cms';
import { mapArticleDetail, type RawArticleDetail } from '@/lib/article-api';
import { articleSlugParamSchema } from '@/lib/validation';
import { success, badRequest, notFound } from '@/lib/api-response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug: rawSlug } = await params;

  const parsed = articleSlugParamSchema.safeParse({ slug: rawSlug });
  if (!parsed.success) {
    return badRequest('Invalid slug', { errors: parsed.error.flatten().fieldErrors });
  }

  // sanityFetch() returns null both when the slug doesn't match any
  // article and when the underlying Sanity query itself fails (it never
  // throws - see packages/cms/src/lib/fetch.ts) - the same "not found"
  // response the web article page already gives an unmatched slug
  // (apps/web/src/app/articles/[slug]/page.tsx calls notFound() in both
  // cases too).
  const article = await sanityFetch<RawArticleDetail>(ARTICLE_API_BY_SLUG_QUERY, {
    slug: parsed.data.slug,
  });

  if (!article) {
    return notFound('Article not found');
  }

  return success(mapArticleDetail(article));
}
