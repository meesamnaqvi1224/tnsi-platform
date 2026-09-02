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
