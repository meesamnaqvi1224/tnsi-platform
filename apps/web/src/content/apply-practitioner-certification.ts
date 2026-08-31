/**
 * Apply — Practitioner Certification page content.
 *
 * This is the application-start page linked from the Practitioner
 * Certification programme page. There is no online application backend yet —
 * the page explains the current next step (Discovery Call or direct contact)
 * rather than presenting a form that doesn't submit anywhere.
 */

export const applyPractitionerCertificationContent = {
  slug: 'apply-practitioner-certification',

  seo: {
    title: 'Apply for Practitioner Certification — The Nervous System Institute',
    description:
      'Begin your application for Practitioner Certification — professional training for practitioners integrating nervous system-informed approaches into their work.',
  },

  hero: {
    eyebrow: 'Practitioner Certification',
    headline: 'Apply for Practitioner Certification',
    supportingCopy:
      'Practitioner Certification is designed for professionals who want deeper training in trauma recovery, nervous system science and somatic practice — and who are ready to bring that understanding into their existing work.',
  },

  nextSteps: {
    heading: 'What happens next',
    paragraphs: [
      'There is no online application form to complete at this stage. The next step is a conversation with the Institute — a Discovery Call or a direct message — to discuss your professional background, current practice and whether the certification is the right fit.',
      'From there, a member of the Institute will guide you through the remainder of the application process directly.',
    ],
    primaryCta: { label: 'Book a Discovery Call', href: '/book-a-call' },
    secondaryCta: { label: 'Contact the Institute', href: '/contact' },
  },

  note: 'Applications are currently completed in conversation with the Institute team.',
} as const;

export type ApplyPractitionerCertificationContent = typeof applyPractitionerCertificationContent;
