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
    body,
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
