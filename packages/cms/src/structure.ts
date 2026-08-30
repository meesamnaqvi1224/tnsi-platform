import type { StructureResolver } from 'sanity/structure';

/**
 * Studio desk layout — groups documents so editors see a clean sidebar:
 * Articles, Programs, Practices, Assessments, then supporting Authors and
 * Categories.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('article').title('Articles'),
      S.documentTypeListItem('program').title('Programs'),
      S.documentTypeListItem('practice').title('Practices'),
      S.documentTypeListItem('assessment').title('Assessments'),
      S.divider(),
      S.documentTypeListItem('author').title('Authors'),
      S.documentTypeListItem('category').title('Categories'),
    ]);
