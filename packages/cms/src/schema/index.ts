import type { SchemaTypeDefinition } from 'sanity';
import { seo } from './objects/seo';
import { blockContent } from './objects/blockContent';
import { author } from './documents/author';
import { category } from './documents/category';
import { article } from './documents/article';
import { program } from './documents/program';

export const schemaTypes: SchemaTypeDefinition[] = [
  // documents
  article,
  program,
  author,
  category,
  // objects
  blockContent,
  seo,
];
