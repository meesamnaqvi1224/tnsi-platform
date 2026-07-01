/**
 * Contact page content.
 *
 * Structured for future Sanity CMS integration — each top-level key maps to a
 * document field or portable-text block.
 */

export const contactContent = {
  slug: 'contact',

  seo: {
    title: 'Contact — The Nervous System Institute',
    description:
      'Whether you have a question, are exploring a programme or would like to collaborate, we\u2019d love to hear from you.',
  },

  hero: {
    chapter: '01',
    eyebrow: 'Institute Contact',
    headline: 'Contact',
    supportingHeadline:
      'Whether you have a question, are exploring a programme or would like to collaborate, we\u2019d love to hear from you.',
    imageSrc: '/placeholders/contact-hero.svg',
    imageAlt:
      'Editorial photograph — warm office interior, books and natural light. No corporate setting.',
    primaryCta: { label: 'Book Discovery Call', href: '/book-a-call' },
    secondaryCta: { label: 'Email Us', href: 'mailto:hello@tnsi.org' },
  },

  methods: {
    chapter: '02',
    heading: 'Ways to connect',
    items: [
      {
        id: 'general',
        title: 'General Enquiries',
        email: 'hello@tnsi.org',
        href: 'mailto:hello@tnsi.org',
        description: 'Questions about the Institute, our approach or how to get started.',
        responseTime: 'Within two business days',
      },
      {
        id: 'programmes',
        title: 'Programme Questions',
        email: 'programmes@tnsi.org',
        href: 'mailto:programmes@tnsi.org',
        description:
          'Enquiries about Life Beyond Trauma, Practitioner Certification and programme fit.',
        responseTime: 'Within two business days',
      },
      {
        id: 'executive',
        title: 'Executive Advisory',
        email: 'executive@tnsi.org',
        href: 'mailto:executive@tnsi.org',
        description: 'Organisational and leadership advisory engagements.',
        responseTime: 'Within three business days',
      },
      {
        id: 'partnerships',
        title: 'Speaking & Partnerships',
        email: 'partnerships@tnsi.org',
        href: 'mailto:partnerships@tnsi.org',
        description: 'Speaking invitations, university collaborations and research partnerships.',
        responseTime: 'Within three business days',
      },
    ],
  },

  form: {
    chapter: '03',
    id: 'contact-form',
    heading: 'Send a message',
    fields: {
      name: { label: 'Name', placeholder: 'Your full name' },
      email: { label: 'Email', placeholder: 'you@example.com' },
      organisation: { label: 'Organisation', placeholder: 'Optional' },
      subject: { label: 'Subject', placeholder: 'How can we help?' },
      message: { label: 'Message', placeholder: 'Tell us a little about your enquiry\u2026' },
    },
    submitLabel: 'Send Message',
    note: 'We aim to respond within two business days.',
  },

  faq: {
    chapter: '04',
    heading: 'Frequently Asked Questions',
    items: [
      {
        question: 'How quickly do you reply?',
        answer:
          'We aim to respond to all enquiries within two business days. Executive and partnership enquiries may take up to three business days depending on complexity.',
      },
      {
        question: 'Can I book internationally?',
        answer:
          'Yes. The Institute works with individuals and organisations worldwide. Discovery Calls and programmes are conducted via secure video conference in your local time zone.',
      },
      {
        question: 'Where are you based?',
        answer:
          'The Nervous System Institute operates internationally with a primary presence in the United Kingdom. All programmes and consultations are available remotely.',
      },
      {
        question: 'Can organisations work with TNSI?',
        answer:
          'Yes. We work with healthcare systems, universities, leadership organisations and corporate teams through Executive Advisory, speaking engagements and bespoke educational partnerships.',
      },
      {
        question: 'How do I know which programme is right?',
        answer:
          'A Discovery Call is the simplest way to determine fit. You can also email programmes@tnsi.org with a brief description of your situation and we will guide you toward the appropriate pathway.',
      },
    ],
  },

  visit: {
    chapter: '05',
    heading: 'Visit & connect',
    description:
      'The Nervous System Institute is an international educational institution. While our primary work is conducted virtually, we maintain a professional presence for consultations, partnerships and institutional relationships.',
    placeholders: [
      { label: 'Office location', value: 'United Kingdom — address forthcoming' },
      { label: 'Business hours', value: 'Monday\u2013Friday, 9:00\u201317:00 GMT' },
      { label: 'Virtual appointments', value: 'Available worldwide via secure video' },
      { label: 'International support', value: 'Enquiries welcomed from all time zones' },
    ],
    mapAlt: 'Map placeholder — Institute location forthcoming.',
  },

  collaboration: {
    chapter: '06',
    heading: 'Interested in collaborating?',
    supportingCopy:
      'We welcome conversations with universities, healthcare providers, leadership organisations and research partners.',
    primaryCta: { label: 'Partnership Enquiry', href: 'mailto:partnerships@tnsi.org' },
    secondaryCta: { label: 'Research Collaboration', href: '/research' },
  },

  closing: {
    chapter: '07',
    headline: 'Every meaningful relationship begins with a conversation.',
    supportingCopy:
      'Whether you\u2019re exploring a programme, seeking guidance or interested in collaboration, we\u2019re here to help.',
    primaryCta: { label: 'Book Discovery Call', href: '/book-a-call' },
    secondaryCta: { label: 'Explore Resources', href: '/resources' },
  },

  footerQuote: {
    quote: 'Curiosity is often the beginning of change.',
    author: 'Caroline Reed',
  },
} as const;

export type ContactContent = typeof contactContent;
export type ContactMethod = (typeof contactContent.methods.items)[number];
export type ContactFaqItem = (typeof contactContent.faq.items)[number];
