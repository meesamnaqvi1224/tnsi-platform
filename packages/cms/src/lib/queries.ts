import { groq } from 'next-sanity';

const imageProjection = `{ "url": asset->url, "alt": alt }`;

/** Articles for the listing page, newest first. */
export const ARTICLES_QUERY = groq`
  *[_type == "article" && defined(slug.current)] | order(publishedAt desc) {
    "id": _id,
    title,
    "slug": slug.current,
    excerpt,
    coverImage ${imageProjection},
    "category": category->title,
    "author": author->name,
    readingTime,
    publishedAt,
    featured
  }
`;

/** Single article by slug, with body + author + related. */
export const ARTICLE_BY_SLUG_QUERY = groq`
  *[_type == "article" && slug.current == $slug][0] {
    "id": _id,
    title,
    "slug": slug.current,
    excerpt,
    coverImage ${imageProjection},
    "category": category->title,
    author->{ name, role, bio, "photo": photo${imageProjection} },
    readingTime,
    publishedAt,
    body[]{
      ...,
      _type == "figure" => { "url": asset->url }
    },
    seo,
    "related": relatedArticles[]->{
      title, "slug": slug.current, excerpt,
      coverImage ${imageProjection}, "category": category->title
    }
  }
`;

/** All published programs, in display order. */
export const PROGRAMS_QUERY = groq`
  *[_type == "program" && status == "published"] | order(order asc) {
    "id": _id,
    title,
    "slug": slug.current,
    audience,
    overview,
    heroImage ${imageProjection},
    format,
    duration,
    outcome,
    ctaLabel,
    ctaHref
  }
`;

/** Slugs for static generation. */
export const ARTICLE_SLUGS_QUERY = groq`*[_type == "article" && defined(slug.current)].slug.current`;

/**
 * Paginated, optionally category-filtered article list for the native
 * mobile API (`/api/v1/articles`) — separate from `ARTICLES_QUERY` above
 * because that one has no params and is tied to the web listing page's
 * fixed shape (`category`/`author` flattened to plain strings). This
 * returns `category`/`author` as small objects instead, since the mobile
 * API contract needs a category slug for filtering, not just its title.
 * `$category` is `""` when no filter is requested — `count()` runs the
 * identical filter so pagination metadata reflects the same set the
 * `items` slice was taken from, in one round trip.
 */
export const ARTICLES_LIST_API_QUERY = groq`
  {
    "items": *[
      _type == "article" && defined(slug.current)
      && ($category == "" || category->slug.current == $category)
    ] | order(publishedAt desc) [$offset...$end] {
      "id": _id,
      title,
      "slug": slug.current,
      excerpt,
      coverImage ${imageProjection},
      category->{ title, "slug": slug.current },
      author->{ name, role },
      readingTime,
      publishedAt,
      featured
    },
    "total": count(*[
      _type == "article" && defined(slug.current)
      && ($category == "" || category->slug.current == $category)
    ])
  }
`;

/**
 * Single article by slug for the native mobile API — separate from
 * `ARTICLE_BY_SLUG_QUERY` above (which the web article page consumes and
 * whose flattened `category`/author-without-photo shape must not change).
 * `related` is bounded to the same compact fields as the list query and
 * never re-expands into `body`/`related` again, so a chain of related
 * articles can never inflate the response.
 */
export const ARTICLE_API_BY_SLUG_QUERY = groq`
  *[_type == "article" && slug.current == $slug][0] {
    "id": _id,
    title,
    "slug": slug.current,
    excerpt,
    coverImage ${imageProjection},
    category->{ title, "slug": slug.current },
    author->{ name, role, "photo": photo${imageProjection} },
    readingTime,
    publishedAt,
    featured,
    body[]{
      ...,
      _type == "figure" => { "url": asset->url }
    },
    "related": relatedArticles[]->{
      "id": _id,
      title,
      "slug": slug.current,
      excerpt,
      coverImage ${imageProjection},
      category->{ title, "slug": slug.current },
      publishedAt,
      readingTime
    }
  }
`;

/**
 * A single published assessment by slug, with its full question/scoring
 * definition. Generic across every assessment the `assessment` document
 * type can define — `$slug` is the only thing that picks out a specific
 * one (e.g. Capacity Assessment); nothing here is specific to that content.
 */
export const ASSESSMENT_BY_SLUG_QUERY = groq`
  *[_type == "assessment" && slug.current == $slug && status == "published"][0] {
    "id": _id,
    title,
    "slug": slug.current,
    questions[] {
      key,
      text,
      choices[] { key, label, value }
    },
    "scoringMethod": scoringLogic.method,
    resultTiers[] { key, title, minScore, maxScore, description },
    emailSequence,
    crmPipeline,
    seo { seoTitle, seoDescription }
  }
`;
