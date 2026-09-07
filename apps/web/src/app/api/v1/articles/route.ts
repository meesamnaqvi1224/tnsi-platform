/**
 * Public article catalogue for the native mobile Resources tab, backed by
 * the same Sanity `article` documents the public `/articles` and
 * `/resources` web pages already read (see `packages/cms/src/lib/queries.ts`'s
 * `ARTICLES_LIST_API_QUERY`). Intentionally unauthenticated: articles are
 * public marketing/editorial content on the web (see
 * `apps/web/src/middleware.ts`'s `isPublicRoute` list), so this API must
 * not require a Clerk session either - the mobile client should see the
 * same catalogue signed in or signed out.
 */
import { sanityFetch } from '@tnsi/cms/server';
import { ARTICLES_LIST_API_QUERY } from '@tnsi/cms';
import { mapArticleListItem, type RawArticleListItem } from '@/lib/article-api';
import { articlesListQuerySchema } from '@/lib/validation';
import { success, badRequest } from '@/lib/api-response';

export const runtime = 'nodejs';

interface ArticlesListQueryResult {
  items: RawArticleListItem[];
  total: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsed = articlesListQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
    category: searchParams.get('category') ?? undefined,
  });
  if (!parsed.success) {
    return badRequest('Invalid query parameters', { errors: parsed.error.flatten().fieldErrors });
  }
  const { limit, offset, category } = parsed.data;

  // sanityFetch() never throws (see packages/cms/src/lib/fetch.ts) - a
  // genuine Sanity failure and "CMS not configured yet" both surface here
  // as `null`, same as the existing web loaders. Both are treated as an
  // empty catalogue rather than an error, matching
  // `apps/web/src/content/cms/loaders.ts`'s existing fallback behavior.
  const result = await sanityFetch<ArticlesListQueryResult>(ARTICLES_LIST_API_QUERY, {
    offset,
    end: offset + limit,
    category: category ?? '',
  });

  const items = result?.items ?? [];
  const total = result?.total ?? 0;

  return success({
    articles: items.map(mapArticleListItem),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + items.length < total,
    },
  });
}
