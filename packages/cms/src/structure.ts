import type { StructureResolver } from 'sanity/structure';

/**
 * Studio desk layout — groups documents so editors see a clean sidebar:
 * Articles, Programs (with Modules/Lessons underneath - the learning
 * content foundation, not yet consumed by any app), Practices,
 * Assessments, PowerDrops, The Return Path's copy (a singleton - one
 * fixed document, opened directly rather than listed), Somatic Series/Cards (a separate content
 * system from Practices/PowerDrops - see
 * docs/TNSI_Somatic_Card_Schema_Design_v1.md - given its own divider
 * rather than grouped with PowerDrops, to keep that separation visible
 * in the Studio itself), then supporting Authors and Categories.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('article').title('Articles'),
      S.documentTypeListItem('program').title('Programs'),
      S.documentTypeListItem('module').title('Modules'),
      S.documentTypeListItem('lesson').title('Lessons'),
      S.documentTypeListItem('practice').title('Practices'),
      S.documentTypeListItem('assessment').title('Assessments'),
      S.documentTypeListItem('powerDrop').title('PowerDrops'),
      S.listItem()
        .title('The Return Path — content')
        .id('returnPathContent')
        .child(S.document().schemaType('returnPathContent').documentId('returnPathContent')),
      S.divider(),
      S.documentTypeListItem('somaticSeries').title('Somatic Series'),
      S.documentTypeListItem('somaticCard').title('Somatic Cards'),
      S.divider(),
      S.documentTypeListItem('author').title('Authors'),
      S.documentTypeListItem('category').title('Categories'),
    ]);
