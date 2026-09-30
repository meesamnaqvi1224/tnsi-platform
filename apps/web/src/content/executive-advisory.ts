/**
 * Private Executive Advisory page content.
 *
 * Structured for future Sanity CMS integration — each top-level key maps to a
 * document field or portable-text block. Components consume this object directly;
 * when Sanity is wired up, replace the static import with a fetch and keep the
 * same shape.
 *
 * Rewritten from Caroline Reed's "TNSI - Program Summaries.docx" (2026-09) -
 * the previous version of this file described generic executive coaching
 * (open-ended engagements, no fixed structure) which the source document
 * directly contradicts: the actual programme is a fixed three-month,
 * six-session advisory built on the Capacity Recalibration Model. Content
 * below is drawn from that source rather than invented. The "twenty years"
 * founder detail is kept - it is an established, site-wide biographical fact
 * (see faculty.ts, discovery-call.ts), not a claim invented here.
 */

export const executiveAdvisoryContent = {
  slug: 'executive-advisory',

  seo: {
    title: 'Private Executive Advisory — The Nervous System Institute',
    description:
      'A structured three-month advisory for founders, CEOs, business owners and senior executives, built on the Capacity Recalibration Model™.',
  },

  hero: {
    chapter: '01',
    eyebrow: 'Private Executive Advisory',
    headline: 'Private Executive Advisory',
    supportingHeadline: 'Building leadership capacity under sustained pressure.',
    supportingCopy:
      'A structured three-month advisory for founders, CEOs, business owners, and senior executives operating within environments of sustained responsibility, complexity, pressure, and demand.',
    imageSrc: '/images/programs/executive/hero-meeting.webp',
    imageAlt:
      'Two women in a focused private strategy conversation at a table in a calm, glass-walled room with natural light.',
    imageCaption:
      'Private advisory engagements for leaders navigating complexity, capacity and culture.',
    metadata: [
      { label: 'Audience', value: 'Founders, CEOs & Senior Executives' },
      { label: 'Format', value: 'Private 1:1 Advisory' },
      { label: 'Structure', value: 'Three Months · Six Sessions' },
    ],
    primaryCta: { label: 'Book an Executive Consultation', href: '/book-a-call' },
    secondaryCta: { label: 'Request Advisory Overview', href: '/prospectus/executive-advisory' },
  },

  challenge: {
    chapter: '02',
    heading: 'Performance does not establish that it is sustainable.',
    paragraphs: [
      'Many high-performing executives continue to lead organisations, make complex decisions, manage teams, and meet significant professional obligations while maintaining that performance through sustained physiological and psychological mobilisation — a pattern the Institute calls Functional Overdrive.',
      'Because performance continues, the internal strain it costs can stay hidden. Over time, Functional Overdrive can be associated with reduced recovery, cognitive fatigue, irritability, sleep disruption, diminished emotional tolerance, decision fatigue, and difficulty disengaging from work.',
      'The Private Executive Advisory makes an important distinction between performance and sustainable performance. The fact that an individual can continue to perform does not, in itself, establish that their current way of operating is sustainable.',
    ],
  },

  audience: {
    chapter: '03',
    heading: 'Who We Work With',
    cards: [
      {
        title: 'Founders',
        description:
          'Founders operating within sustained responsibility, complexity, pressure, and demand — continuing to function effectively while carrying increasing psychological and physiological strain.',
      },
      {
        title: 'CEOs',
        description:
          'CEOs whose decisions, judgment, and capacity for complexity depend on a level of physiological and cognitive resource that sustained pressure can quietly erode.',
      },
      {
        title: 'Business owners',
        description:
          'Business owners carrying persistent pressure, decision fatigue, and reduced recovery while performance continues to look, from the outside, unaffected.',
      },
      {
        title: 'Senior executives',
        description:
          'Senior executives showing patterns of Functional Overdrive — performance maintained despite operating beyond sustainable capacity.',
      },
    ],
  },

  areas: {
    chapter: '04',
    heading: 'What the Advisory Includes',
    panels: [
      {
        id: 'capacity-audit',
        title: 'Executive Capacity Audit',
        description:
          'A comprehensive audit establishing how you are currently operating — demand, energy expenditure and recovery, decision load, and capacity constraints.',
        href: '/book-a-call',
      },
      {
        id: 'somatic-load-mapping',
        title: 'Somatic Load Mapping',
        description:
          'Assessment that extends beyond cognitive or behavioural accounts of stress, examining how sustained executive demand is carried physiologically.',
        href: '/book-a-call',
      },
      {
        id: 'advisory-dossier',
        title: 'Executive Advisory Dossier™',
        description:
          'A personalised dossier synthesising your assessment into a structured analysis of your operating profile — the baseline the advisory works from.',
        href: '/book-a-call',
      },
      {
        id: 'capacity-recalibration-model',
        title: 'The Capacity Recalibration Model™',
        description:
          'Five phases — capacity assessment and clarification, stabilisation, load reorganisation, capacity expansion, and consolidation — structure the advisory from baseline to sustainable practice.',
        href: '/book-a-call',
      },
      {
        id: 'weekly-monitoring',
        title: 'Six Sessions & Weekly Monitoring',
        description:
          'Six structured individual advisory sessions, supplemented by weekly monitoring that tracks load, recovery, and capacity in real-world conditions between sessions.',
        href: '/book-a-call',
      },
      {
        id: 'continuation-plan',
        title: '90-Day Continuation Plan',
        description:
          'A final dossier and a 90-day plan for the period after formal completion, reducing the likelihood of an unintentional return to previous patterns.',
        href: '/book-a-call',
      },
    ],
  },

  journey: {
    chapter: '05',
    heading: 'The Five Phases',
    intro:
      'A formal enquiry and suitability process, followed by onboarding and the Executive Capacity Audit, leads into the five phases of the Capacity Recalibration Model™.',
    steps: [
      {
        title: 'Capacity Assessment & Clarification',
        description:
          'You develop a detailed understanding of your current operating pattern — the relationship between the demands you carry and the resources available to meet them.',
      },
      {
        title: 'Stabilisation',
        description:
          'Support to reduce unnecessary physiological and psychological expenditure and improve regulation and recovery, through personalised strategies matched to your assessment profile.',
      },
      {
        title: 'Load Reorganisation',
        description:
          'The advisory examines the structure around you — how responsibility, workload, decision-making, and boundaries are currently organised — rather than treating pressure as purely internal.',
      },
      {
        title: 'Capacity Expansion',
        description:
          'Once greater stability is established, you learn to identify personal capacity thresholds and support greater complexity and responsibility without recreating overdrive.',
      },
      {
        title: 'Consolidation, Integration & Participation',
        description:
          'The work is brought together and translated into your ongoing professional practice, with the emphasis moving from active recalibration to sustainable implementation.',
      },
    ],
  },

  outcomes: {
    chapter: '06',
    heading: 'Outcomes',
    before: {
      label: 'Functional Overdrive',
      items: [
        'Reduced recovery',
        'Cognitive fatigue',
        'Decision fatigue',
        'Diminished emotional tolerance',
        'Difficulty disengaging from work',
      ],
    },
    after: {
      label: 'Intended Outcomes',
      items: [
        'A clearer understanding of your operating model',
        'Improved recognition of personal capacity thresholds',
        'Identification of unnecessary or poorly distributed load',
        'Clearer boundaries around responsibility and decision-making',
        'Earlier recognition of Functional Overdrive patterns',
      ],
    },
  },

  founder: {
    chapter: '07',
    heading: 'Why Caroline Reed',
    imageSrc: '/images/programs/executive/founder-portrait.webp',
    imageAlt: 'Portrait of Caroline Reed — Private Executive Advisory and leadership education.',
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
          'The Private Executive Advisory is a confidential, individual advisory for founders, CEOs, business owners, and senior executives. Organisations wanting to address pressure, responsibility, and capacity at a team or system level should explore the System-Level Executive Advisory instead.',
      },
      {
        question: 'How long does the advisory last?',
        answer:
          'The Private Executive Advisory is a structured three-month programme, comprising six individual advisory sessions, weekly monitoring, and a final 90-Day Continuation Plan.',
      },
      {
        question: 'Is every engagement built around a fixed structure?',
        answer:
          'Yes. The advisory follows the five phases of the Capacity Recalibration Model\u2122 \u2014 capacity assessment and clarification, stabilisation, load reorganisation, capacity expansion, and consolidation \u2014 informed throughout by your own Executive Capacity Audit and Somatic Load Mapping.',
      },
      {
        question: 'What happens at the start of the advisory?',
        answer:
          'The advisory begins with a formal enquiry and suitability process, followed by structured onboarding and a comprehensive Executive Capacity Audit, which is synthesised into your personalised Executive Advisory Dossier\u2122.',
      },
      {
        question: 'Is international delivery available?',
        answer:
          'Yes. Advisory is delivered virtually and in-person internationally, with scheduled private sessions supplemented by weekly monitoring throughout the three-month programme.',
      },
    ],
  },

  cta: {
    chapter: '09',
    headline: 'Sustainable performance starts with sustainable capacity.',
    supportingCopy:
      'The Private Executive Advisory helps founders, CEOs, business owners, and senior executives move from performance maintained through sustained overextension towards a more sustainable model of executive functioning.',
    primaryCta: { label: 'Book Executive Consultation', href: '/book-a-call' },
    secondaryCta: { label: 'Contact Us', href: '/contact' },
  },

  footerQuote: {
    quote: 'The nervous system shapes leadership long before strategy becomes action.',
    author: 'Caroline Reed',
  },
} as const;

export type ExecutiveAdvisoryContent = typeof executiveAdvisoryContent;
