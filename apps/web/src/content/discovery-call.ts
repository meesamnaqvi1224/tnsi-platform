/**
 * Discovery Call page content.
 *
 * Structured for future Sanity CMS integration — each top-level key maps to a
 * document field or portable-text block.
 */

export const discoveryCallContent = {
  slug: 'book-a-call',

  seo: {
    title: 'Book a Discovery Call — The Nervous System Institute',
    description:
      'A calm conversation to explore where you are today, what you\u2019re experiencing and which path may be right for you.',
  },

  hero: {
    chapter: '01',
    eyebrow: 'Discovery Call',
    headline: 'Book a Discovery Call',
    supportingHeadline:
      'A calm conversation to explore where you are today, what you\u2019re experiencing and which path may be right for you.',
    supportingCopy:
      'This is not a therapy session. It is not a sales call. It is an opportunity to understand your goals, ask questions and determine whether The Nervous System Institute is the right fit for your next step.',
    imageSrc: '/placeholders/discovery-hero.svg',
    imageAlt:
      'Editorial photograph — warm natural light, comfortable conversation, tea and books. No corporate setting.',
    primaryCta: { label: 'Schedule Your Call', href: '#booking' },
    secondaryCta: { label: 'Email Us Instead', href: 'mailto:hello@tnsi.org' },
  },

  process: {
    chapter: '02',
    heading: 'What happens during the call',
    steps: [
      {
        number: '01',
        title: 'Get to know you',
        description:
          'We learn about your goals, challenges and current situation — at a pace that feels comfortable for you.',
      },
      {
        number: '02',
        title: 'Explore your options',
        description:
          'We\u2019ll discuss which programme or pathway best aligns with your needs, without pressure to decide immediately.',
      },
      {
        number: '03',
        title: 'Ask anything',
        description:
          'You\u2019ll have space to ask questions about the process, programmes and next steps. No question is too small.',
      },
      {
        number: '04',
        title: 'Leave with clarity',
        description:
          'Whether or not you decide to continue, you\u2019ll leave with a clearer understanding of your options.',
      },
    ],
  },

  eligibility: {
    chapter: '03',
    id: 'eligibility',
    heading: 'Is this right for you?',
    idealHeading: 'Ideal if',
    idealItems: [
      'You\u2019re a high-achieving woman experiencing burnout, overwhelm or anxiety.',
      'You\u2019re interested in the Life Beyond Trauma Method.',
      'You\u2019re considering Practitioner Certification.',
      'You\u2019re exploring Executive Advisory.',
      'You\u2019re looking for an evidence-informed approach.',
    ],
    notAppropriateHeading: 'Not appropriate if',
    notAppropriateItems: [
      'You\u2019re experiencing an immediate mental health crisis.',
      'You\u2019re seeking emergency clinical support.',
      'You\u2019re looking for a quick-fix solution.',
    ],
    crisisNotice:
      'If you are in crisis or need urgent support, please contact your local emergency services or a crisis helpline in your country. This Discovery Call is not a substitute for emergency mental health care.',
  },

  caroline: {
    chapter: '04',
    heading: 'Meet Caroline',
    name: 'Caroline Reed',
    credentials: [
      '20+ years in practice',
      'Trauma therapist',
      'Founder',
      'Evidence-informed educator',
    ],
    biography: [
      'Caroline Reed is the founder of The Nervous System Institute and a trauma-informed educator with more than twenty years of clinical experience. Her work integrates neuroscience, attachment theory and somatic practice into practical frameworks for sustainable change.',
      'She has worked with high-achieving women, senior leaders and practitioners across Europe and North America — always with the same commitment: understand deeply, teach responsibly, and meet people where they are.',
    ],
    imageSrc: '/images/discovery/caroline-portrait.webp',
    imageAlt: 'Professional portrait of Caroline Reed — warm natural light, editorial treatment.',
    cta: { label: 'Learn More About Caroline', href: '/about' },
  },

  faq: {
    chapter: '05',
    heading: 'Frequently Asked Questions',
    items: [
      {
        question: 'How long is the Discovery Call?',
        answer:
          'Discovery Calls are typically thirty minutes. This is enough time to understand your situation, answer your questions and discuss potential next steps — without rushing.',
      },
      {
        question: 'Is there any obligation afterwards?',
        answer:
          'None. The call exists to help you make an informed decision. There is no pressure to enrol in a programme, and no follow-up unless you request it.',
      },
      {
        question: 'How do we meet?',
        answer:
          'Calls take place via secure video conference. You will receive a link in your confirmation email. A stable internet connection and a quiet space are all you need.',
      },
      {
        question: 'Can I attend from another country?',
        answer:
          'Yes. The Institute works with individuals and organisations internationally. Calls are scheduled in your local time zone.',
      },
      {
        question: 'What if I\u2019m unsure which programme I need?',
        answer:
          'That is one of the most common reasons people book. The Discovery Call is designed precisely for this — to help you understand which pathway, if any, fits your current situation.',
      },
      {
        question: 'Can organisations book consultations?',
        answer:
          'Yes. Leaders and organisations interested in Executive Advisory or team-based programmes can book a Discovery Call to discuss scope, context and fit. For dedicated organisational enquiries, you may also email executive@tnsi.org.',
      },
    ],
  },

  booking: {
    chapter: '06',
    id: 'booking',
    heading: 'Choose a time that works for you.',
    paragraphs: [
      'Booking is simple and takes less than a minute. Select an available time that suits your schedule — our system detects your time zone automatically.',
      'You will receive a confirmation email with your appointment details and a calendar invitation. Reminder emails are sent before your call so you can prepare without worry.',
    ],
  },

  alternativeContact: {
    chapter: '07',
    heading: 'Alternative ways to connect',
    items: [
      {
        id: 'email',
        title: 'Email',
        value: 'hello@tnsi.org',
        href: 'mailto:hello@tnsi.org',
        description: 'For general enquiries and questions before booking.',
      },
      {
        id: 'phone',
        title: 'Phone',
        value: 'Available soon',
        description: 'A direct line for those who prefer to speak before scheduling.',
      },
      {
        id: 'organisation',
        title: 'Organisation Enquiries',
        value: 'executive@tnsi.org',
        href: 'mailto:executive@tnsi.org',
        description: 'For executive advisory, team programmes and organisational partnerships.',
      },
    ],
  },

  closing: {
    chapter: '08',
    headline: 'Healing begins with one conversation.',
    supportingCopy:
      'Sometimes the hardest part is simply knowing where to begin. If you\u2019re curious, we\u2019d love to meet you.',
    primaryCta: { label: 'Schedule Your Discovery Call', href: '#booking' },
    secondaryCta: { label: 'Browse Programmes', href: '/programs' },
  },

  footerQuote: {
    quote: 'The right conversation at the right time can change everything.',
    author: 'Caroline Reed',
  },
} as const;

export type DiscoveryCallContent = typeof discoveryCallContent;
export type ProcessStep = (typeof discoveryCallContent.process.steps)[number];
export type AlternativeContactItem = (typeof discoveryCallContent.alternativeContact.items)[number];
export type DiscoveryFaqItem = (typeof discoveryCallContent.faq.items)[number];
