/**
 * Practitioner Certification — Programme Overview page content.
 *
 * Serves as the current destination for the "Download Prospectus" CTA on the
 * Practitioner Certification programme page. There is no PDF prospectus yet,
 * so this page is an editorial overview built from the same source content —
 * not a fake download. Facts are pulled from `content/practitioner-certification.ts`;
 * only framing copy (hero, CTA) is new.
 */

export const prospectusPractitionerCertificationContent = {
  slug: 'prospectus-practitioner-certification',

  seo: {
    title: 'Practitioner Certification — Programme Overview — The Nervous System Institute',
    description:
      'A programme overview of Practitioner Certification — purpose, audience, curriculum and outcomes — for practitioners considering the certification.',
  },

  hero: {
    eyebrow: 'Practitioner Certification',
    headline: 'Programme Overview',
    supportingCopy:
      'A downloadable prospectus isn’t available yet — this page is the current overview of Practitioner Certification: its purpose, audience, curriculum and outcomes.',
  },

  cta: {
    heading: 'Ready to take the next step?',
    supportingCopy:
      'Apply for Practitioner Certification, or book a Discovery Call to discuss whether the programme is the right fit for your practice.',
    primaryCta: { label: 'Apply for Certification', href: '/apply/practitioner-certification' },
    secondaryCta: { label: 'Book a Discovery Call', href: '/book-a-call' },
  },
} as const;

export type ProspectusPractitionerCertificationContent =
  typeof prospectusPractitionerCertificationContent;
