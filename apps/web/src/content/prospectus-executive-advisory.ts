/**
 * Private Executive Advisory — Programme Overview page content.
 *
 * Serves as the current destination for the "Download Advisory Overview" CTA
 * on the Private Executive Advisory programme page. There is no PDF document
 * yet, so this page is an editorial overview built from the same source
 * content — not a fake download. Facts are pulled from
 * `content/executive-advisory.ts`; only framing copy (hero, CTA) is new.
 */

export const prospectusExecutiveAdvisoryContent = {
  slug: 'prospectus-executive-advisory',

  seo: {
    title: 'Private Executive Advisory — Programme Overview — The Nervous System Institute',
    description:
      'A programme overview of the Private Executive Advisory — context, advisory areas and who the Institute works with — for leaders considering the advisory.',
  },

  hero: {
    eyebrow: 'Private Executive Advisory',
    headline: 'Programme Overview',
    supportingCopy:
      'A downloadable overview document isn’t available yet — this page is the current overview of the Private Executive Advisory: its context, advisory areas and who the Institute works with.',
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
