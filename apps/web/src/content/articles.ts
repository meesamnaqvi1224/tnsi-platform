import { NEWSLETTER_PRIVACY_NOTE } from '@/content/shared';

/**
 * Articles listing page content.
 *
 * Structured for future Sanity CMS integration — each top-level key maps to a
 * document field or portable-text block. Components consume this object directly;
 * when Sanity is wired up, replace the static import with a fetch and keep the
 * same shape.
 */

export type ArticleVariant = 'large' | 'medium' | 'compact';

export interface ArticleItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  readingTime: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  variant: ArticleVariant;
}

export const articlesContent = {
  slug: 'articles',

  seo: {
    title: 'Articles — The Nervous System Institute',
    description:
      'Thoughtful perspectives on neuroscience, trauma recovery, leadership and nervous system education from The Nervous System Institute.',
  },

  hero: {
    chapter: '01',
    eyebrow: 'Institute Publication',
    headline: 'Articles',
    supportingHeadline:
      'Thoughtful perspectives on neuroscience, trauma recovery, leadership and nervous system education.',
    supportingCopy: 'Explore our latest writing, research summaries and practical insights.',
    imageSrc: '/images/articles/hero.webp',
    imageAlt:
      'A writing desk with an open notebook, books and a mug beside a window in soft natural light.',
    primaryCta: { label: 'Latest Articles', href: '#latest' },
  },

  featured: {
    chapter: '02',
    category: 'Neuroscience',
    publishedAt: 'June 2026',
    readingTime: '14 min read',
    title: 'The Nervous System as a Framework for Understanding Human Behaviour',
    summary:
      'A long-form introduction to how autonomic state shapes perception, relationships and the capacity for change — written for curious readers and serious practitioners alike.',
    imageSrc: '/images/articles/featured.webp',
    imageAlt: 'A woman writing notes in a journal at a sunlit desk beside a window.',
    href: '/articles/nervous-system-framework',
  },

  categories: {
    chapter: '03',
    heading: 'Categories',
    items: [
      {
        id: 'neuroscience',
        label: 'Neuroscience',
        count: 18,
        href: '/articles?category=neuroscience',
      },
      {
        id: 'trauma-recovery',
        label: 'Trauma Recovery',
        count: 14,
        href: '/articles?category=trauma-recovery',
      },
      { id: 'leadership', label: 'Leadership', count: 9, href: '/articles?category=leadership' },
      {
        id: 'practitioner-education',
        label: 'Practitioner Education',
        count: 12,
        href: '/articles?category=practitioner-education',
      },
      { id: 'research', label: 'Research', count: 7, href: '/articles?category=research' },
      { id: 'interviews', label: 'Interviews', count: 5, href: '/articles?category=interviews' },
    ],
  },

  latest: {
    chapter: '04',
    heading: 'Latest Articles',
    items: [
      {
        id: 'polyvagal-everyday',
        slug: 'polyvagal-theory-in-practice',
        title: 'Polyvagal Theory in Everyday Practice',
        summary:
          'Translating Stephen Porges\u2019 framework into language clinicians, coaches and educators can use with confidence.',
        category: 'Neuroscience',
        publishedAt: 'June 2026',
        readingTime: '8 min read',
        imageSrc: '/images/articles/latest-polyvagal.webp',
        imageAlt:
          'A notebook, book, pen and mug arranged on a textured oak desktop, seen from above.',
        href: '/articles/polyvagal-theory-in-practice',
        variant: 'large',
      },
      {
        id: 'window-tolerance',
        slug: 'window-of-tolerance',
        title: 'The Window of Tolerance Explained',
        summary: 'A clear guide to dysregulation, hyperarousal and the physiology of overwhelm.',
        category: 'Trauma Recovery',
        publishedAt: 'June 2026',
        readingTime: '6 min read',
        imageSrc: '/images/articles/latest-window-tolerance.webp',
        imageAlt:
          'A quiet reading corner with a wooden chair, throw and books beside a bright window.',
        href: '/articles/window-of-tolerance',
        variant: 'medium',
      },
      {
        id: 'leadership-physiology',
        slug: 'nervous-system-of-leadership',
        title: 'The Physiology of Executive Decision-Making',
        summary:
          'How autonomic state shapes judgment under pressure and the culture leaders create.',
        category: 'Leadership',
        publishedAt: 'May 2026',
        readingTime: '10 min read',
        imageSrc: '/images/articles/latest-leadership.webp',
        imageAlt:
          'An editorial flat lay of white books, an open notebook and a coffee cup on a desk.',
        href: '/articles/nervous-system-of-leadership',
        variant: 'medium',
      },
      {
        id: 'co-regulation',
        slug: 'co-regulation',
        title: 'Co-Regulation and Relational Safety',
        summary: 'Why connection is a physiological intervention, not merely a therapeutic ideal.',
        category: 'Neuroscience',
        publishedAt: 'May 2026',
        readingTime: '7 min read',
        imageSrc: '/images/resources/card-co-regulation.webp',
        imageAlt: 'A minimal interior with a linen lounge chair and books by garden doors.',
        href: '/articles/co-regulation',
        variant: 'compact',
      },
      {
        id: 'case-integration',
        slug: 'case-integration',
        title: 'Case Integration for Practitioners',
        summary: 'Weaving nervous system science into clinical formulation and client work.',
        category: 'Practitioner Education',
        publishedAt: 'May 2026',
        readingTime: '12 min read',
        imageSrc: '/images/resources/card-case-integration.webp',
        imageAlt: 'Stacked white neuroscience books, an open notebook and a mug on an oak desk.',
        href: '/articles/case-integration',
        variant: 'compact',
      },
      {
        id: 'burnout-physiology',
        slug: 'physiology-of-burnout',
        title: 'The Physiology of Burnout',
        summary: 'Beyond metaphor — examining the nervous system mechanisms of chronic exhaustion.',
        category: 'Trauma Recovery',
        publishedAt: 'April 2026',
        readingTime: '9 min read',
        imageSrc: '/images/resources/card-burnout.webp',
        imageAlt:
          'A neuroscience library with oak shelving and a reading chair beside a tall window.',
        href: '/articles/physiology-of-burnout',
        variant: 'compact',
      },
      {
        id: 'neuroception',
        slug: 'neuroception-and-safety',
        title: 'Neuroception and the Science of Safety',
        summary:
          'How the nervous system detects threat and safety beneath conscious awareness — and what that means for healing.',
        category: 'Research',
        publishedAt: 'April 2026',
        readingTime: '11 min read',
        imageSrc: '/images/articles/latest-neuroception.webp',
        imageAlt:
          'An open book and cup of tea on a table beneath an arched window looking onto greenery.',
        href: '/articles/neuroception-and-safety',
        variant: 'large',
      },
      {
        id: 'interview-caroline',
        slug: 'interview-caroline-reed',
        title: 'In Conversation: Caroline Reed on Trauma-Informed Education',
        summary:
          'The founder reflects on twenty years of clinical practice and the evolution of nervous system education.',
        category: 'Interviews',
        publishedAt: 'March 2026',
        readingTime: '15 min read',
        imageSrc: '/images/articles/latest-interview.webp',
        imageAlt: 'A woman sitting reflectively at a table with a notebook beside a large window.',
        href: '/articles/interview-caroline-reed',
        variant: 'medium',
      },
      {
        id: 'somatic-markers',
        slug: 'somatic-markers-in-therapy',
        title: 'Somatic Markers in Therapeutic Work',
        summary:
          'Integrating body-based signals into evidence-informed clinical practice without losing rigour.',
        category: 'Practitioner Education',
        publishedAt: 'March 2026',
        readingTime: '8 min read',
        imageSrc: '/images/articles/latest-somatic.webp',
        imageAlt:
          'An editorial desk with books, an open notebook and a mug beside a window in warm light.',
        href: '/articles/somatic-markers-in-therapy',
        variant: 'medium',
      },
      {
        id: 'team-dysregulation',
        slug: 'team-dysregulation',
        title: 'When Teams Become Dysregulated',
        summary: 'Emotional contagion in organisations and what leaders can do about it.',
        category: 'Leadership',
        publishedAt: 'February 2026',
        readingTime: '7 min read',
        imageSrc: '/images/articles/latest-leadership.webp',
        imageAlt: 'An editorial flat lay of books, an open notebook and a coffee cup on a desk.',
        href: '/articles/team-dysregulation',
        variant: 'compact',
      },
      {
        id: 'attachment-nervous-system',
        slug: 'attachment-and-nervous-system',
        title: 'Attachment and the Nervous System',
        summary: 'Bridging attachment theory with polyvagal science for a unified clinical lens.',
        category: 'Research',
        publishedAt: 'February 2026',
        readingTime: '10 min read',
        imageSrc: '/images/articles/latest-window-tolerance.webp',
        imageAlt: 'A quiet reading corner with a wooden chair and books beside a bright window.',
        href: '/articles/attachment-and-nervous-system',
        variant: 'compact',
      },
      {
        id: 'regulation-daily-life',
        slug: 'regulation-in-daily-life',
        title: 'Regulation in Daily Life',
        summary: 'Practical nervous system practices that fit into ordinary routines.',
        category: 'Neuroscience',
        publishedAt: 'January 2026',
        readingTime: '5 min read',
        imageSrc: '/images/articles/latest-polyvagal.webp',
        imageAlt: 'A notebook, book, pen and mug arranged on an oak desktop, seen from above.',
        href: '/articles/regulation-in-daily-life',
        variant: 'compact',
      },
    ] satisfies ArticleItem[],
  },

  // Topics were removed in Batch C2 — no article ever carried a `topic`
  // field; the chips were pure decoration with no data model behind them.
  // See the Batch C1 audit and the Batch C2 report.

  // Editor's Picks were removed in Batch C2 — all three pointed at article
  // slugs that were never written. Repointing them to unrelated existing
  // articles would have misrepresented one piece of writing as three, so
  // the section was removed rather than patched with a dishonest redirect.
  // See the Batch C1 audit and the Batch C2 report.

  newsletter: {
    chapter: '05',
    heading: 'Stay informed.',
    description:
      'Receive new articles, research updates and educational insights directly from The Nervous System Institute.',
    privacyNote: NEWSLETTER_PRIVACY_NOTE,
    submitLabel: 'Subscribe',
  },

  closing: {
    chapter: '06',
    headline: 'Ideas become meaningful when they improve the way we live and lead.',
    primaryCta: { label: 'Browse Resources', href: '/resources' },
    secondaryCta: { label: 'Book a Discovery Call', href: '/book-a-call' },
  },

  pagination: {
    currentPage: 1,
    totalPages: 3,
    baseHref: '/articles',
  },

  footerQuote: {
    quote: 'Every article is an invitation to understand yourself a little more deeply.',
    author: 'Caroline Reed',
  },
} as const;

export type ArticlesContent = typeof articlesContent;
export type ArticleCategory = (typeof articlesContent.categories.items)[number];
