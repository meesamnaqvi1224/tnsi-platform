import type { SchemaTypeDefinition } from 'sanity';
import { seo } from './objects/seo';
import { blockContent } from './objects/blockContent';
import { author } from './documents/author';
import { category } from './documents/category';
import { article } from './documents/article';
import { program } from './documents/program';
import { practice } from './documents/practice';

export const schemaTypes: SchemaTypeDefinition[] = [
  // documents
  article,
  program,
  practice,
  author,
  category,
  // objects
  blockContent,
  seo,
];
