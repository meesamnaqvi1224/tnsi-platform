/**
 * Executive Advisory page content.
 *
 * Structured for future Sanity CMS integration — each top-level key maps to a
 * document field or portable-text block. Components consume this object directly;
 * when Sanity is wired up, replace the static import with a fetch and keep the
 * same shape.
 */

export const executiveAdvisoryContent = {
  slug: 'executive-advisory',

  seo: {
    title: 'Executive Advisory — The Nervous System Institute',
    description:
      'Private advisory for senior leaders and executive teams. Build organisations that perform sustainably through nervous system-informed leadership.',
  },

  hero: {
    chapter: '01',
    eyebrow: 'Executive Advisory',
    headline: 'Executive Advisory',
    supportingHeadline: 'Building leadership capacity under sustained pressure.',
    supportingCopy:
      'Modern organisations don\u2019t just need better strategies. They need leaders capable of making clear decisions, leading through uncertainty and creating environments where people can perform without chronic stress.',
    imageSrc: '/images/programs/executive/hero-meeting.webp',
    imageAlt:
      'Two women in a focused private strategy conversation at a table in a calm, glass-walled room with natural light.',
    imageCaption:
      'Private advisory engagements for leaders navigating complexity, capacity and culture.',
    metadata: [
      { label: 'Audience', value: 'Senior Leaders & Executive Teams' },
      { label: 'Format', value: 'Private Advisory' },
      { label: 'Delivery', value: 'Virtual & In-Person' },
    ],
    primaryCta: { label: 'Book an Executive Consultation', href: '/book-a-call' },
    secondaryCta: { label: 'Request Advisory Overview', href: '/prospectus/executive-advisory' },
  },

  challenge: {
    chapter: '02',
    heading: 'Leadership today demands more than performance.',
    paragraphs: [
      'Executive burnout is no longer exceptional — it is structural. Leaders carry decision fatigue, emotional contagion and the weight of organisational uncertainty without the frameworks to regulate under sustained pressure.',
      'The hidden cost of dysregulated leadership extends far beyond the individual. It shapes culture, erodes trust and creates environments where high performance becomes synonymous with chronic stress.',
      'Nervous system capacity is not a wellness concept. It is a leadership capability — the physiological foundation for clear judgment, calm authority and cultures that sustain performance over time.',
    ],
  },

  audience: {
    chapter: '03',
    heading: 'Who We Work With',
    cards: [
      {
        title: 'CEOs',
        description:
          'Leaders responsible for organisational direction who need a confidential space to examine decision-making, resilience and the physiological dimension of executive authority.',
      },
      {
        title: 'Founders',
        description:
          'Entrepreneurs building high-growth companies who recognise that sustainable scale requires regulated leadership — not heroic endurance.',
      },
      {
        title: 'Executive Teams',
        description:
          'Senior leadership groups seeking shared language, aligned capacity and healthier dynamics across the C-suite and board level.',
      },
      {
        title: 'Healthcare Leaders',
        description:
          'Clinical and administrative leaders navigating high-stakes environments where dysregulated culture directly affects patient outcomes and staff retention.',
      },
      {
        title: 'Education Leaders',
        description:
          'Heads of institutions and senior educators building environments where staff and students can thrive without systemic burnout.',
      },
      {
        title: 'High Growth Companies',
        description:
          'Organisations in rapid expansion who need leadership infrastructure that scales culture, not just revenue.',
      },
    ],
  },

  areas: {
    chapter: '04',
    heading: 'Advisory Areas',
    panels: [
      {
        id: 'leadership-capacity',
        title: 'Leadership Capacity',
        description:
          'Develop the physiological and cognitive reserves required to lead through complexity without depleting yourself or your organisation.',
        href: '/book-a-call',
      },
      {
        id: 'executive-resilience',
        title: 'Executive Resilience',
        description:
          'Build sustainable patterns of recovery, regulation and presence that withstand the demands of senior leadership.',
        href: '/book-a-call',
      },
      {
        id: 'decision-making',
        title: 'Decision Making',
        description:
          'Strengthen clarity under pressure — understanding how nervous system state shapes judgment, risk tolerance and strategic choice.',
        href: '/book-a-call',
      },
      {
        id: 'organisational-culture',
        title: 'Organisational Culture',
        description:
          'Examine how leadership physiology shapes team dynamics, psychological safety and the unwritten rules of your organisation.',
        href: '/book-a-call',
      },
      {
        id: 'change-leadership',
        title: 'Change Leadership',
        description:
          'Navigate transformation, restructuring and uncertainty with regulated authority that models stability for the entire organisation.',
        href: '/book-a-call',
      },
      {
        id: 'high-performance',
        title: 'High Performance Without Burnout',
        description:
          'Redefine what sustainable excellence looks like — performance systems that elevate capacity rather than extract it.',
        href: '/book-a-call',
      },
    ],
  },

  journey: {
    chapter: '05',
    heading: 'Advisory Journey',
    intro:
      'A structured engagement designed for executive contexts — confidential, bespoke and oriented toward long-term organisational impact.',
    steps: [
      {
        title: 'Discovery',
        description:
          'Initial consultation to understand your leadership context, organisational challenges and advisory objectives.',
      },
      {
        title: 'Leadership Assessment',
        description:
          'A structured evaluation of leadership capacity, team dynamics and the physiological patterns shaping your organisation.',
      },
      {
        title: 'Strategic Advisory',
        description:
          'Private advisory sessions translating nervous system science into leadership strategy and organisational application.',
      },
      {
        title: 'Implementation',
        description:
          'Supported integration of frameworks into daily leadership practice, team rituals and cultural infrastructure.',
      },
      {
        title: 'Long-Term Partnership',
        description:
          'Ongoing advisory relationship for leaders committed to sustained organisational transformation.',
      },
    ],
  },

  outcomes: {
    chapter: '06',
    heading: 'Outcomes',
    before: {
      label: 'Before',
      items: [
        'Reactive leadership',
        'Decision fatigue',
        'Leadership isolation',
        'Burnout culture',
        'Low trust',
      ],
    },
    after: {
      label: 'After',
      items: [
        'Calm decision-making',
        'Greater organisational capacity',
        'Healthy leadership culture',
        'Psychological safety',
        'Long-term sustainable performance',
      ],
    },
  },

  founder: {
    chapter: '07',
    heading: 'Why Caroline Reed',
    imageSrc: '/images/programs/executive/founder-portrait.webp',
    imageAlt: 'Portrait of Caroline Reed — executive advisory and leadership education.',
    paragraphs: [
      'Caroline Reed brings more than twenty years of experience in trauma recovery, leadership education and nervous system science.',
      'Her advisory work combines clinical expertise, evidence-informed methodology and a deep understanding of how physiological state shapes executive judgment, team culture and organisational performance.',
      'Executives engage Caroline not for coaching platitudes — but for rigorous, confidential counsel grounded in neuroscience and decades of practice.',
    ],
    cta: { label: 'Meet Caroline', href: '/about' },
  },

  faq: {
    chapter: '08',
    heading: 'Frequently Asked Questions',
    items: [
      {
        question: 'Is this for individuals or organisations?',
        answer:
          'Both. Executive Advisory serves individual leaders seeking confidential counsel and organisations investing in leadership team development. Engagements are scoped to your context during the discovery phase.',
      },
      {
        question: 'Can leadership teams participate together?',
        answer:
          'Yes. Team-based advisory is a core offering. Executive teams benefit from shared frameworks, aligned language and facilitated sessions that address group dynamics alongside individual leadership capacity.',
      },
      {
        question: 'Are engagements customised?',
        answer:
          'Every engagement is bespoke. There is no fixed curriculum or programme structure. Advisory is shaped around your organisation\u2019s challenges, leadership context and strategic objectives.',
      },
      {
        question: 'Is international delivery available?',
        answer:
          'Yes. Advisory is delivered virtually and in-person internationally. Senior leaders across time zones engage through scheduled private sessions with supplementary resources tailored to their organisation.',
      },
      {
        question: 'How long does an advisory engagement last?',
        answer:
          'Engagement length varies by scope. Some leaders engage for a focused three-month advisory period; others maintain long-term partnerships spanning years. Duration is agreed during discovery based on your objectives.',
      },
    ],
  },

  cta: {
    chapter: '09',
    headline: 'Great organisations begin with regulated leadership.',
    supportingCopy:
      'The quality of leadership influences every conversation, every decision and every culture. Executive Advisory helps leaders build organisations capable of sustained performance without sacrificing the wellbeing of their people.',
    primaryCta: { label: 'Book Executive Consultation', href: '/book-a-call' },
    secondaryCta: { label: 'Contact Us', href: '/contact' },
  },

  footerQuote: {
    quote: 'The nervous system shapes leadership long before strategy becomes action.',
    author: 'Caroline Reed',
  },
} as const;

export type ExecutiveAdvisoryContent = typeof executiveAdvisoryContent;
