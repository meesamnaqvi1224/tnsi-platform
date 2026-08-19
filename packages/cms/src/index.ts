// Environment configuration
export { apiVersion, dataset, projectId, sanityConfigured, readToken } from './env';

// Client & fetch utilities
export { client } from './lib/client';
export { urlForImage } from './lib/image';
export {
  ARTICLES_QUERY,
  ARTICLE_BY_SLUG_QUERY,
  PROGRAMS_QUERY,
  ARTICLE_SLUGS_QUERY,
} from './lib/queries';

// Schema
export { schemaTypes } from './schema';
export { article } from './schema/documents/article';
export { program } from './schema/documents/program';
export { practice } from './schema/documents/practice';
export { author } from './schema/documents/author';
export { category } from './schema/documents/category';
export { blockContent } from './schema/objects/blockContent';
export { seo } from './schema/objects/seo';

// Studio structure
export { structure } from './structure';

export const VERSION = '0.0.0';
