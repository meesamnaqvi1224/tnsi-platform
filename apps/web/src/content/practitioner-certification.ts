/**
 * Practitioner Certification page content.
 *
 * Structured for future Sanity CMS integration — each top-level key maps to a
 * document field or portable-text block. Components consume this object directly;
 * when Sanity is wired up, replace the static import with a fetch and keep the
 * same shape.
 */

export const practitionerCertificationContent = {
  slug: 'practitioner-certification',

  seo: {
    title: 'Practitioner Certification — The Nervous System Institute',
    description:
      'Professional training for practitioners who want to integrate nervous system-informed approaches into their work. An evidence-informed certification designed for real-world clinical application.',
  },

  hero: {
    chapter: '01',
    eyebrow: 'Professional Certification',
    headline: 'Practitioner Certification',
    supportingHeadline:
      'Professional training for practitioners who want to integrate nervous system-informed approaches into their work.',
    supportingCopy:
      'Develop a deeper understanding of trauma, regulation and nervous system science through an evidence-informed educational framework designed for real-world application.',
    imageSrc: '/images/programs/practitioner/hero-workshop.webp',
    imageAlt:
      'Practitioners discussing notes together around a table in a bright, plant-filled teaching studio.',
    imageCaption:
      'Live teaching sessions bring nervous system science into structured, practice-ready frameworks.',
    metadata: [
      { label: 'Format', value: 'Live + structured study' },
      { label: 'Duration', value: '12 months' },
      { label: 'Credential', value: 'TNSI Certification' },
    ],
    primaryCta: { label: 'Book a Discovery Call', href: '/book-a-call' },
    secondaryCta: { label: 'Request Prospectus', href: '/prospectus/practitioner-certification' },
  },

  audience: {
    chapter: '02',
    heading: 'Designed for professionals who support people.',
    professions: [
      'Psychologists',
      'Therapists',
      'Counsellors',
      'Coaches',
      'Healthcare Professionals',
      'Wellbeing Practitioners',
    ],
    closingCopy:
      'Whether you work in private practice, healthcare, education or organisational wellbeing, this certification provides a practical framework that complements your existing expertise.',
  },

  purpose: {
    chapter: '03',
    heading: 'Why This Certification Exists',
    paragraphs: [
      'Many professionals understand trauma intellectually but lack a practical framework for translating nervous system science into everyday client work.',
      'This certification bridges the gap between research and application.',
      'Rather than replacing your current practice, it strengthens it.',
    ],
  },

  curriculum: {
    chapter: '04',
    heading: "What You'll Learn",
    intro:
      'A structured learning journey through six integrated modules — designed to move from foundational science to confident clinical application.',
    modules: [
      { number: 1, title: 'Foundations of Nervous System Science' },
      { number: 2, title: 'Trauma Physiology' },
      { number: 3, title: 'Polyvagal Theory' },
      { number: 4, title: 'Regulation Strategies' },
      { number: 5, title: 'Clinical Application' },
      { number: 6, title: 'Case Integration' },
    ],
  },

  experience: {
    chapter: '05',
    heading: 'Learning Experience',
    features: [
      {
        title: 'Live Teaching Sessions',
        description:
          'Structured seminars led by Caroline Reed, translating neuroscience into frameworks you can apply in session the following week.',
      },
      {
        title: 'Evidence-Based Learning',
        description:
          'Curriculum grounded in peer-reviewed research and fifteen years of clinical observation — not therapeutic trend or anecdote.',
      },
      {
        title: 'Clinical Case Discussions',
        description:
          'Supervised case integration sessions where practitioners examine real-world application with peers and faculty.',
      },
      {
        title: 'Practical Application',
        description:
          'Structured assignments and implementation exercises designed to embed nervous system language into your existing practice.',
      },
    ],
  },

  outcomes: {
    chapter: '06',
    heading: 'Certification Outcomes',
    before: {
      label: 'Before Certification',
      items: [
        'Understanding theory',
        'Limited clinical framework',
        'Inconsistent nervous system language',
        'Working in isolation',
      ],
    },
    after: {
      label: 'After Certification',
      items: [
        'Evidence-informed framework',
        'Confident client application',
        'Shared clinical language',
        'Professional community',
      ],
    },
  },

  founder: {
    chapter: '07',
    heading: 'Why Learn With Caroline Reed',
    imageSrc: '/images/programs/practitioner/founder-portrait.webp',
    imageAlt: 'Portrait of Caroline Reed, founder of The Nervous System Institute.',
    paragraphs: [
      'Caroline Reed brings more than twenty years of clinical experience in trauma recovery and nervous system education.',
      'Her teaching combines neuroscience, psychology, somatic approaches and practical implementation into one coherent framework.',
      'This certification reflects decades of research, practice and refinement.',
    ],
    cta: { label: 'Meet Caroline', href: '/about' },
  },

  faq: {
    chapter: '08',
    heading: 'Frequently Asked Questions',
    items: [
      {
        question: 'Do I need previous trauma training?',
        answer:
          'No prior training in trauma or nervous system science is required. The certification is designed to build from foundational principles. You should, however, hold an existing professional qualification and active practice in a relevant field — psychology, therapy, counselling, coaching, healthcare or wellbeing.',
      },
      {
        question: 'Is the certification live or self-paced?',
        answer:
          'The programme combines live teaching sessions with structured self-paced study. Live seminars provide the primary instructional framework; supplementary materials, readings and implementation exercises are completed between sessions at your own pace.',
      },
      {
        question: 'How long does it take?',
        answer:
          'The certification is structured as a twelve-month programme. This duration allows sufficient time for deep integration of the material into your existing professional practice, including supervised case discussions and practical application assignments.',
      },
      {
        question: 'Will I receive certification?',
        answer:
          'Graduates who complete all modules, attend required live sessions and pass the case integration assessment receive TNSI Practitioner Certification — a credential that signals evidence-informed nervous system education to clients, employers and professional networks.',
      },
      {
        question: 'Can I study internationally?',
        answer:
          'Yes. The programme is designed for international practitioners. Live teaching sessions are delivered online with scheduled times published in advance across time zones. All supplementary materials and resources are accessible globally.',
      },
    ],
  },

  cta: {
    chapter: '09',
    headline: 'Bring nervous system-informed practice into your professional work.',
    supportingCopy:
      'Join a growing community of practitioners committed to delivering safer, evidence-informed care.',
    primaryCta: { label: 'Book a Discovery Call', href: '/book-a-call' },
    secondaryCta: { label: 'Request Prospectus', href: '/prospectus/practitioner-certification' },
  },

  footerQuote: {
    quote: 'Professional excellence begins with understanding the nervous system.',
    author: 'Caroline Reed',
  },
} as const;

export type PractitionerCertificationContent = typeof practitionerCertificationContent;
