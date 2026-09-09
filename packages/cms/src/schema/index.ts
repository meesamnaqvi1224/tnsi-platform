import type { SchemaTypeDefinition } from 'sanity';
import { seo } from './objects/seo';
import { blockContent } from './objects/blockContent';
import { author } from './documents/author';
import { category } from './documents/category';
import { article } from './documents/article';
import { program } from './documents/program';
import { module } from './documents/module';
import { lesson } from './documents/lesson';
import { practice } from './documents/practice';
import { assessment } from './documents/assessment';
import { powerDrop } from './documents/powerDrop';

export const schemaTypes: SchemaTypeDefinition[] = [
  // documents
  article,
  program,
  module,
  lesson,
  practice,
  assessment,
  powerDrop,
  author,
  category,
  // objects
  blockContent,
  seo,
];
