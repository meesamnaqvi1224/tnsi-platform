/**
 * Search page content and placeholder index.
 *
 * Structured for future search backend integration — replace static results
 * with API-driven results without changing the UI component contract.
 */

export const searchContent = {
  slug: 'search',

  seo: {
    title: 'Search',
    description: 'Search articles, programmes and resources from The Nervous System Institute.',
  },

  hero: {
    heading: 'Search',
    supportingCopy: 'Find articles, programmes and educational resources across the Institute.',
    placeholder: 'Search articles, programmes, resources\u2026',
  },

  suggestions: [
    'nervous system regulation',
    'polyvagal theory',
    'trauma recovery',
    'practitioner certification',
    'executive advisory',
    'burnout',
  ] as const,

  /**
   * A second curated term list, distinct from `suggestions` above. Named
   * `popularSearches` deliberately — this is not per-visitor search
   * history (nothing tracks that), so it must never be labeled "Recent
   * searches" in the UI, which would misrepresent it as personalized.
   */
  popularSearches: ['window of tolerance', 'attachment theory', 'Life Beyond Trauma'] as const,

  groups: {
    articles: 'Articles',
    programs: 'Programs',
    resources: 'Resources',
  } as const,

  emptyState: {
    heading: 'No results found',
    supportingCopy:
      'Try a different search term, or explore our suggestions below. A full search index will be available in a future release.',
  },

  index: [
    {
      id: 'article-framework',
      title: 'A Nervous System Framework for Sustainable Change',
      excerpt: 'An introduction to the physiological foundations of regulation and learning.',
      href: '/articles/nervous-system-framework',
      group: 'articles' as const,
      keywords: ['nervous system', 'framework', 'regulation', 'polyvagal'],
    },
    {
      id: 'article-polyvagal',
      title: 'Polyvagal Theory in Practice',
      excerpt:
        'Translating Stephen Porges\u2019 research into clinical and educational application.',
      href: '/articles/polyvagal-theory-in-practice',
      group: 'articles' as const,
      keywords: ['polyvagal', 'theory', 'practice', 'neuroscience'],
    },
    {
      id: 'article-window',
      title: 'Understanding the Window of Tolerance',
      excerpt: 'How autonomic state shapes capacity, learning and relational engagement.',
      href: '/articles/window-of-tolerance',
      group: 'articles' as const,
      keywords: ['window', 'tolerance', 'regulation', 'trauma'],
    },
    {
      id: 'program-certification',
      title: 'Practitioner Certification',
      excerpt: 'Structured certification for professionals integrating nervous system science.',
      href: '/programs/practitioner-certification',
      group: 'programs' as const,
      keywords: ['certification', 'practitioner', 'training', 'education'],
    },
    {
      id: 'program-executive',
      title: 'Executive Advisory',
      excerpt:
        'Confidential advisory for leaders addressing the physiology of capacity and culture.',
      href: '/programs/executive-advisory',
      group: 'programs' as const,
      keywords: ['executive', 'advisory', 'leadership', 'organisation'],
    },
    {
      id: 'program-method',
      title: 'The Life Beyond Trauma Method',
      excerpt: 'The Institute\u2019s evidence-informed methodology for sustainable human change.',
      href: '/programs/life-beyond-trauma',
      group: 'programs' as const,
      keywords: ['life beyond trauma', 'method', 'programme', 'recovery'],
    },
    {
      id: 'resource-hub',
      title: 'Resources',
      excerpt: 'Articles, guides and educational materials from the Institute.',
      href: '/resources',
      group: 'resources' as const,
      keywords: ['resources', 'guides', 'library', 'education'],
    },
    {
      id: 'resource-research',
      title: 'Research',
      excerpt: 'Evidence, clinical observation and areas of investigation.',
      href: '/research',
      group: 'resources' as const,
      keywords: ['research', 'evidence', 'science', 'publications'],
    },
  ],
} as const;

export type SearchResultItem = (typeof searchContent.index)[number];
export type SearchGroup = SearchResultItem['group'];
