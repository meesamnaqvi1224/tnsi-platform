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
    secondaryCta: { label: 'Browse Topics', href: '#topics' },
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

  topics: {
    chapter: '05',
    heading: 'Popular Topics',
    items: [
      {
        id: 'polyvagal-theory',
        label: 'Polyvagal Theory',
        href: '/articles?topic=polyvagal-theory',
      },
      { id: 'capacity', label: 'Capacity', href: '/articles?topic=capacity' },
      { id: 'burnout', label: 'Burnout', href: '/articles?topic=burnout' },
      { id: 'leadership', label: 'Leadership', href: '/articles?topic=leadership' },
      { id: 'safety', label: 'Safety', href: '/articles?topic=safety' },
      { id: 'trauma', label: 'Trauma', href: '/articles?topic=trauma' },
      { id: 'regulation', label: 'Regulation', href: '/articles?topic=regulation' },
      { id: 'healing', label: 'Healing', href: '/articles?topic=healing' },
      { id: 'practitioner', label: 'Practitioner', href: '/articles?topic=practitioner' },
      { id: 'neuroscience', label: 'Neuroscience', href: '/articles?topic=neuroscience' },
    ],
  },

  editorsPicks: {
    chapter: '06',
    heading: 'Editor\u2019s Picks',
    items: [
      {
        id: 'pick-capacity',
        title: 'Building Capacity Beyond Resilience',
        summary:
          'Why resilience is an insufficient frame — and what nervous system capacity offers instead.',
        imageSrc: '/images/articles/editors-capacity.webp',
        imageAlt:
          'A luxury flat lay of books, an open journal, reading glasses and a cup of coffee on a desk.',
        href: '/articles/building-capacity-beyond-resilience',
        layout: 'image-left' as const,
      },
      {
        id: 'pick-trauma-informed',
        title: 'What Trauma-Informed Really Means',
        summary:
          'Moving beyond buzzwords toward physiology, safety and evidence-informed practice.',
        imageSrc: '/images/articles/editors-trauma-informed.webp',
        imageAlt:
          'Hands writing in an open journal beside a cup of tea and books on a wooden table.',
        href: '/articles/what-trauma-informed-means',
        layout: 'image-right' as const,
      },
      {
        id: 'pick-leadership-culture',
        title: 'Leadership Culture Starts in the Nervous System',
        summary:
          'How a leader\u2019s physiological state becomes the unwritten policy of an organisation.',
        imageSrc: '/images/articles/editors-leadership-culture.webp',
        imageAlt:
          'An executive office with an oak desk, chair and bookshelves beside a garden window.',
        href: '/articles/leadership-culture-nervous-system',
        layout: 'image-left' as const,
      },
    ],
  },

  newsletter: {
    chapter: '07',
    heading: 'Stay informed.',
    description:
      'Receive new articles, research updates and educational insights directly from The Nervous System Institute.',
    privacyNote: NEWSLETTER_PRIVACY_NOTE,
    submitLabel: 'Subscribe',
  },

  closing: {
    chapter: '08',
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
export type EditorsPickItem = (typeof articlesContent.editorsPicks.items)[number];
