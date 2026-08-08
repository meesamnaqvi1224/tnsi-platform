import type { SchemaTypeDefinition } from 'sanity';
import { seo, blockContent, author, category, article, program } from '@tnsi/cms';

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
