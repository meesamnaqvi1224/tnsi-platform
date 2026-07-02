import { NEWSLETTER_PRIVACY_NOTE } from '@/content/shared';

/**
 * Resources hub page content.
 *
 * Structured for future Sanity CMS integration — each top-level key maps to a
 * document field or portable-text block. Components consume this object directly;
 * when Sanity is wired up, replace the static import with a fetch and keep the
 * same shape.
 */

export const resourcesContent = {
  slug: 'resources',

  seo: {
    title: 'Resources — The Nervous System Institute',
    description:
      'Evidence-informed articles, guides, research and educational resources to deepen your understanding of the nervous system.',
  },

  hero: {
    chapter: '01',
    eyebrow: 'Knowledge Library',
    headline: 'Resources',
    supportingHeadline:
      'Evidence-informed articles, guides, research and educational resources to deepen your understanding of the nervous system.',
    supportingCopy:
      'Explore practical knowledge grounded in neuroscience, trauma recovery and nervous system education.',
    imageSrc: '/images/resources/hero-landscape.webp',
    imageAlt: 'Caroline Reed in an editorial portrait for the Institute knowledge library.',
    primaryCta: { label: 'Browse Resources', href: '#categories' },
    secondaryCta: { label: 'Latest Articles', href: '#latest' },
  },

  featured: {
    chapter: '02',
    title: 'Understanding Your Nervous System',
    description:
      'A comprehensive introduction to how the nervous system shapes behaviour, relationships and long-term wellbeing.',
    imageSrc: '/images/resources/featured-resource.webp',
    imageAlt: 'Caroline Reed in an editorial portrait for featured resources.',
    href: '/articles/understanding-your-nervous-system',
    cta: 'Read Guide',
  },

  categories: {
    chapter: '03',
    heading: 'Resource Categories',
    items: [
      {
        id: 'neuroscience',
        title: 'Neuroscience',
        description:
          'Foundational articles on nervous system science, polyvagal theory and the physiology of regulation.',
        count: '12 resources',
        href: '/resources/neuroscience',
      },
      {
        id: 'trauma-recovery',
        title: 'Trauma Recovery',
        description:
          'Evidence-informed perspectives on trauma physiology, recovery pathways and long-term healing.',
        count: '9 resources',
        href: '/resources/trauma-recovery',
      },
      {
        id: 'leadership',
        title: 'Leadership',
        description:
          'How nervous system capacity shapes executive decision-making, culture and organisational performance.',
        count: '7 resources',
        href: '/resources/leadership',
      },
      {
        id: 'practitioner-education',
        title: 'Practitioner Education',
        description:
          'Clinical frameworks, case integration and professional development for trauma-informed practitioners.',
        count: '11 resources',
        href: '/resources/practitioner-education',
      },
    ],
  },

  latest: {
    chapter: '04',
    heading: 'Latest Resources',
    items: [
      {
        id: 'polyvagal-theory-practice',
        title: 'Polyvagal Theory in Everyday Practice',
        category: 'Neuroscience',
        summary:
          'Translating Stephen Porges\u2019 polyvagal framework into practical language for clinicians, coaches and educators.',
        readingTime: '8 min read',
        publishedAt: 'June 2026',
        href: '/articles/polyvagal-theory-in-practice',
        imageSrc: '/images/resources/card-neuroscience.webp',
        imageAlt: 'Research papers and annotated notes on a desk.',
        layout: 'image-left' as const,
      },
      {
        id: 'trauma-window-tolerance',
        title: 'The Window of Tolerance Explained',
        category: 'Trauma Recovery',
        summary:
          'A clear, evidence-informed guide to understanding dysregulation, hyperarousal and the physiology of overwhelm.',
        readingTime: '6 min read',
        publishedAt: 'May 2026',
        href: '/articles/window-of-tolerance',
        imageSrc: '/images/resources/card-trauma-recovery.webp',
        imageAlt: 'Quiet reading space with natural light.',
        layout: 'image-right' as const,
      },
      {
        id: 'executive-nervous-system',
        title: 'The Nervous System of Leadership',
        category: 'Leadership',
        summary:
          'How physiological state shapes executive judgment, team dynamics and the hidden architecture of organisational culture.',
        readingTime: '10 min read',
        publishedAt: 'May 2026',
        href: '/articles/nervous-system-of-leadership',
        imageSrc: '/images/resources/card-leadership.webp',
        imageAlt: 'Executive journal and pen on a wooden desk.',
        layout: 'image-left' as const,
      },
      {
        id: 'case-integration',
        title: 'Case Integration for Practitioners',
        category: 'Practitioner Education',
        summary:
          'A structured approach to weaving nervous system science into clinical case formulation and client work.',
        readingTime: '12 min read',
        publishedAt: 'April 2026',
        href: '/articles/case-integration',
        imageSrc: '/images/resources/card-practitioner-education.webp',
        imageAlt: 'Clinical notes and reference texts.',
        layout: 'image-right' as const,
      },
      {
        id: 'co-regulation',
        title: 'Co-Regulation and Relational Safety',
        category: 'Neuroscience',
        summary:
          'Understanding how relational presence regulates the nervous system — and why connection is a physiological intervention.',
        readingTime: '7 min read',
        publishedAt: 'April 2026',
        href: '/articles/co-regulation',
        imageSrc: '/images/resources/card-clinical-practice.webp',
        imageAlt: 'Two chairs in a calm consultation space.',
        layout: 'image-left' as const,
      },
      {
        id: 'burnout-physiology',
        title: 'The Physiology of Burnout',
        category: 'Trauma Recovery',
        summary:
          'Moving beyond metaphor to examine the nervous system mechanisms underlying chronic stress, exhaustion and collapse.',
        readingTime: '9 min read',
        publishedAt: 'March 2026',
        href: '/articles/physiology-of-burnout',
        imageSrc: '/images/resources/card-research-methods.webp',
        imageAlt: 'Stacked books beside a window with soft daylight.',
        layout: 'image-right' as const,
      },
    ],
  },

  collections: {
    chapter: '05',
    heading: 'Resource Collections',
    items: [
      {
        id: 'healing-foundations',
        title: 'Healing Foundations',
        description:
          'Essential readings for individuals beginning their journey toward nervous system awareness and trauma-informed healing.',
        count: '14 resources',
        href: '/resources/collections/healing-foundations',
      },
      {
        id: 'professional-practice',
        title: 'Professional Practice',
        description:
          'Curated resources for therapists, coaches and healthcare professionals integrating nervous system science into client work.',
        count: '18 resources',
        href: '/resources/collections/professional-practice',
      },
      {
        id: 'leadership-library',
        title: 'Leadership Library',
        description:
          'Articles and guides for executives and organisational leaders exploring the physiological dimension of leadership.',
        count: '10 resources',
        href: '/resources/collections/leadership-library',
      },
    ],
  },

  guides: {
    chapter: '06',
    heading: 'Downloadable Guides',
    intro:
      'In-depth PDF guides designed for study, reference and professional development. Free to download.',
    items: [
      {
        id: 'science-of-safety',
        title: 'The Science of Safety',
        description:
          'A practitioner-ready guide to neuroception, safety cues and the physiological foundations of felt security.',
        href: '/guides/science-of-safety',
      },
      {
        id: 'building-capacity',
        title: 'Building Capacity',
        description:
          'Practical frameworks for expanding nervous system capacity through regulation, recovery and intentional practice.',
        href: '/guides/building-capacity',
      },
      {
        id: 'trauma-performance',
        title: 'Trauma and Performance',
        description:
          'Examining how unresolved trauma physiology affects professional performance, leadership and long-term wellbeing.',
        href: '/guides/trauma-and-performance',
      },
    ],
  },

  newsletter: {
    chapter: '07',
    heading: 'Continue Learning',
    description:
      'Receive carefully curated articles, research summaries and educational insights from The Nervous System Institute.',
    privacyNote: NEWSLETTER_PRIVACY_NOTE,
    submitLabel: 'Subscribe',
  },

  closing: {
    chapter: '08',
    headline: 'Knowledge becomes transformation when it is put into practice.',
    supportingCopy:
      'Every resource published by The Nervous System Institute exists to help individuals, practitioners and leaders build greater nervous system capacity.',
    primaryCta: { label: 'Explore Articles', href: '/articles' },
    secondaryCta: { label: 'Book a Discovery Call', href: '/book-a-call' },
  },

  footerQuote: {
    quote: 'Education creates awareness. Practice creates change.',
    author: 'Caroline Reed',
  },
} as const;

export type ResourcesContent = typeof resourcesContent;
export type ResourceItem = (typeof resourcesContent.latest.items)[number];
export type ResourceCategory = (typeof resourcesContent.categories.items)[number];
export type ResourceCollectionItem = (typeof resourcesContent.collections.items)[number];
