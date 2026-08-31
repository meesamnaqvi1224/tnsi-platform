/**
 * Executive Advisory — Programme Overview page content.
 *
 * Serves as the current destination for the "Download Advisory Overview" CTA
 * on the Executive Advisory programme page. There is no PDF document yet, so
 * this page is an editorial overview built from the same source content —
 * not a fake download. Facts are pulled from `content/executive-advisory.ts`;
 * only framing copy (hero, CTA) is new.
 */

export const prospectusExecutiveAdvisoryContent = {
  slug: 'prospectus-executive-advisory',

  seo: {
    title: 'Executive Advisory — Programme Overview — The Nervous System Institute',
    description:
      'A programme overview of Executive Advisory — context, advisory areas and who the Institute works with — for leaders and organisations considering advisory.',
  },

  hero: {
    eyebrow: 'Executive Advisory',
    headline: 'Programme Overview',
    supportingCopy:
      'A downloadable overview document isn’t available yet — this page is the current overview of Executive Advisory: its context, advisory areas and who the Institute works with.',
  },

  cta: {
    heading: 'Ready to take the next step?',
    supportingCopy:
      'Book an executive consultation, or contact the Institute to discuss scope, context and fit for your organisation.',
    primaryCta: { label: 'Book an Executive Consultation', href: '/book-a-call' },
    secondaryCta: { label: 'Contact Us', href: '/contact' },
  },
} as const;

export type ProspectusExecutiveAdvisoryContent = typeof prospectusExecutiveAdvisoryContent;
