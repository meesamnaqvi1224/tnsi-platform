import type { SchemaTypeDefinition } from 'sanity';
import { seo } from '@/sanity/schema/objects/seo';
import { blockContent } from '@/sanity/schema/objects/blockContent';
import { author } from '@/sanity/schema/documents/author';
import { category } from '@/sanity/schema/documents/category';
import { article } from '@/sanity/schema/documents/article';
import { program } from '@/sanity/schema/documents/program';

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
