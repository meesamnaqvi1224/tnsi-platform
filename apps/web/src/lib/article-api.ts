/**
 * Server-side mapping from raw Sanity `article` query results
 * (`ARTICLES_LIST_API_QUERY` / `ARTICLE_API_BY_SLUG_QUERY`) to the stable
 * JSON contract `/api/v1/articles*` returns.
 *
 * Deliberately separate from `apps/web/src/lib/articles.ts`'s
 * `transformSanityBody()`: that function feeds the web's own
 * `ArticleBodyBlock` render DSL and is free to change alongside the web
 * article template. This file is a public API response contract consumed
 * by a client (native mobile) this repo doesn't control the release cycle
 * of, so it must not shift just because the web renderer refactors -
 * hence its own copy of the block mapping rather than importing the web
 * one.
 */

export interface ApiImage {
  url: string;
  alt: string;
}

export interface ApiCategory {
  title: string;
  slug: string | null;
}

export interface ApiAuthorSummary {
  name: string;
  role: string | null;
}

export interface ApiAuthorDetail extends ApiAuthorSummary {
  photo: ApiImage | null;
}

export interface ApiArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: ApiImage | null;
  category: ApiCategory | null;
  author: ApiAuthorSummary | null;
  publishedAt: string | null;
  readingTime: string | null;
  featured: boolean;
}

export interface ApiRelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: ApiImage | null;
  category: ApiCategory | null;
  publishedAt: string | null;
  readingTime: string | null;
}

/**
 * Mirrors `ArticleBodyBlock` (apps/web/src/content/article-posts/types.ts)
 * field-for-field, minus its web-only `note` variant (never produced by
 * this transform) — kept in sync deliberately so a future native renderer
 * can reuse the same mental model as the web one, without either being
 * able to break the other.
 */
export type ApiArticleBodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string; id: string }
  | { type: 'pullQuote'; quote: string }
  | { type: 'orderedList'; items: string[] }
  | { type: 'unorderedList'; items: string[] }
  | { type: 'figure'; imageSrc: string | null; imageAlt: string; caption: string }
  | { type: 'callout'; title: string | null; text: string };

export interface ApiArticleDetail {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: ApiImage | null;
  category: ApiCategory | null;
  author: ApiAuthorDetail | null;
  publishedAt: string | null;
  readingTime: string | null;
  featured: boolean;
  body: ApiArticleBodyBlock[];
  related: ApiRelatedArticle[];
}

// --- Raw shapes returned by the GROQ projections ---

interface RawImage {
  url?: string | null;
  alt?: string | null;
}
interface RawCategory {
  title?: string | null;
  slug?: string | null;
}
interface RawAuthorSummary {
  name?: string | null;
  role?: string | null;
}
interface RawAuthorDetail extends RawAuthorSummary {
  photo?: RawImage | null;
}
interface RawBodyBlock {
  _type: string;
  style?: string;
  listItem?: string;
  children?: { text?: string }[];
  // figure (image)
  url?: string;
  alt?: string;
  caption?: string;
  // callout
  title?: string;
  text?: string;
}
export interface RawArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: RawImage | null;
  category?: RawCategory | null;
  author?: RawAuthorSummary | null;
  readingTime?: string | null;
  publishedAt?: string | null;
  featured?: boolean | null;
}
export interface RawRelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: RawImage | null;
  category?: RawCategory | null;
  publishedAt?: string | null;
  readingTime?: string | null;
}
export interface RawArticleDetail extends RawArticleListItem {
  author?: RawAuthorDetail | null;
  body?: RawBodyBlock[] | null;
  related?: RawRelatedArticle[] | null;
}

function mapImage(image: RawImage | null | undefined): ApiImage | null {
  if (!image?.url) return null;
  return { url: image.url, alt: image.alt ?? '' };
}

function mapCategory(category: RawCategory | null | undefined): ApiCategory | null {
  if (!category?.title) return null;
  return { title: category.title, slug: category.slug ?? null };
}

export function mapArticleListItem(doc: RawArticleListItem): ApiArticleListItem {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    coverImage: mapImage(doc.coverImage),
    category: mapCategory(doc.category),
    author: doc.author?.name ? { name: doc.author.name, role: doc.author.role ?? null } : null,
    publishedAt: doc.publishedAt ?? null,
    readingTime: doc.readingTime ?? null,
    featured: doc.featured ?? false,
  };
}

export function mapRelatedArticle(doc: RawRelatedArticle): ApiRelatedArticle {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    coverImage: mapImage(doc.coverImage),
    category: mapCategory(doc.category),
    publishedAt: doc.publishedAt ?? null,
    readingTime: doc.readingTime ?? null,
  };
}

function plainText(block: RawBodyBlock): string {
  return (block.children ?? []).map((child) => child.text ?? '').join('');
}

/** "How relationships shape lives" -> "how-relationships-shape-lives", for in-page heading anchors. */
function headingId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Portable Text (`block`, the `figure` image member, and the `callout`
 * object — packages/cms/src/schema/objects/blockContent.ts) into the flat
 * `ApiArticleBodyBlock` list above.
 *
 * Every block type the schema currently defines is handled. Inline marks
 * (bold/italic/links) are flattened to plain text, same as the web's own
 * `transformSanityBody` - the web has never rendered rich inline marks
 * either, so this isn't a new gap introduced here, and no new block/mark
 * type is invented to cover it.
 */
export function transformArticleBody(
  blocks: RawBodyBlock[] | null | undefined,
): ApiArticleBodyBlock[] {
  if (!blocks || blocks.length === 0) return [];

  const result: ApiArticleBodyBlock[] = [];
  let list: { style: 'bullet' | 'number'; items: string[] } | null = null;

  function flushList() {
    if (!list) return;
    result.push(
      list.style === 'bullet'
        ? { type: 'unorderedList', items: list.items }
        : { type: 'orderedList', items: list.items },
    );
    list = null;
  }

  for (const block of blocks) {
    if (block._type === 'block') {
      if (block.listItem) {
        const style = block.listItem === 'number' ? 'number' : 'bullet';
        if (!list || list.style !== style) {
          flushList();
          list = { style, items: [] };
        }
        list.items.push(plainText(block));
        continue;
      }

      flushList();
      const text = plainText(block);
      if (block.style === 'h2' || block.style === 'h3') {
        result.push({
          type: 'heading',
          level: block.style === 'h2' ? 2 : 3,
          text,
          id: headingId(text),
        });
      } else if (block.style === 'blockquote') {
        result.push({ type: 'pullQuote', quote: text });
      } else if (text) {
        result.push({ type: 'paragraph', text });
      }
      continue;
    }

    flushList();

    if (block._type === 'figure') {
      result.push({
        type: 'figure',
        imageSrc: block.url ?? null,
        imageAlt: block.alt ?? '',
        caption: block.caption ?? '',
      });
      continue;
    }

    if (block._type === 'callout') {
      result.push({ type: 'callout', title: block.title ?? null, text: block.text ?? '' });
    }
  }

  flushList();
  return result;
}

export function mapArticleDetail(doc: RawArticleDetail): ApiArticleDetail {
  return {
    ...mapArticleListItem(doc),
    author: doc.author?.name
      ? { name: doc.author.name, role: doc.author.role ?? null, photo: mapImage(doc.author.photo) }
      : null,
    body: transformArticleBody(doc.body),
    related: (doc.related ?? []).map(mapRelatedArticle),
  };
}
