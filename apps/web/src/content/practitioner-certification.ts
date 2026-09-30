/**
 * Practitioner Certification Pathway page content.
 *
 * Structured for future Sanity CMS integration — each top-level key maps to a
 * document field or portable-text block. Components consume this object directly;
 * when Sanity is wired up, replace the static import with a fetch and keep the
 * same shape.
 *
 * Rewritten from Caroline Reed's "TNSI - Program Summaries.docx" (2026-09).
 * The previous version invented a programme duration ("12 months"), six
 * named modules, and an eligibility list that included Coaches and Wellbeing
 * Practitioners — all unsupported. Per the source document, this pathway is
 * reserved for appropriately qualified, licensed or regulated clinicians;
 * coaches without a clinical background belong to the separate Life Beyond
 * Trauma Coaching Certificate (see the Academy page), not here. Duration,
 * module count and pricing are not specified in the source, so this page
 * uses neutral language ("provided as part of the Academy application
 * process") rather than inventing them. The curriculum section instead
 * features the Private Executive Advisory Practitioner Certification, the
 * one advanced pathway the source document does describe in named detail.
 */

export const practitionerCertificationContent = {
  slug: 'practitioner-certification',

  seo: {
    title: 'Practitioner Certification Pathway — The Nervous System Institute',
    description:
      'The Academy’s advanced professional route for appropriately qualified, licensed or regulated clinicians seeking certification in specialist TNSI methodologies.',
  },

  hero: {
    chapter: '01',
    eyebrow: 'Professional Certification',
    headline: 'Practitioner Certification Pathway',
    supportingHeadline:
      'The advanced professional route for practitioners delivering specialist TNSI methodologies.',
    supportingCopy:
      'For practitioners seeking certification to deliver specialist Nervous System Institute methodologies that require clinical judgement, professional formulation, assessment, or work with complex presentations.',
    imageSrc: '/images/programs/practitioner/hero-workshop.webp',
    imageAlt:
      'Practitioners discussing notes together around a table in a bright, plant-filled teaching studio.',
    imageCaption:
      'Structured education, supervised practice and formal assessment for licensed clinicians.',
    metadata: [
      { label: 'Format', value: 'Advanced Professional Certification' },
      { label: 'Entry', value: 'Licensed / Regulated Clinicians' },
      { label: 'Credential', value: 'TNSI Practitioner Certification' },
    ],
    primaryCta: { label: 'Book a Discovery Call', href: '/book-a-call' },
    secondaryCta: { label: 'Request Prospectus', href: '/prospectus/practitioner-certification' },
  },

  audience: {
    chapter: '02',
    heading: 'Reserved for appropriately qualified clinicians.',
    professions: ['Psychotherapists', 'Psychologists', 'Counsellors', 'Healthcare Professionals'],
    closingCopy:
      'Entry requires appropriate qualification and the relevant licence, registration, regulation, or recognised professional standing for your discipline and jurisdiction, subject to the specific entry criteria for each certification programme. Coaches and other non-clinical practitioners wanting to support people through the Life Beyond Trauma Method™ should explore the Life Beyond Trauma Coaching Certificate instead.',
  },

  purpose: {
    chapter: '03',
    heading: 'Why This Pathway Exists',
    paragraphs: [
      'The Practitioner Certification Pathway extends significantly beyond attendance at training. It establishes that a practitioner has not simply learned a methodology, but can use it responsibly and competently within an appropriate professional scope.',
      'Candidates complete structured theoretical education, formal assessment, practical application, supervised practice, and competency review, with attention to professional governance, client suitability, risk and safety, scope of practice, referral, documentation, and ethical decision-making.',
      'The requirement for a clinical professional background reflects the level of judgement and responsibility involved in delivering advanced Institute methodologies.',
    ],
  },

  curriculum: {
    chapter: '04',
    heading: 'Private Executive Advisory Practitioner Certification',
    intro:
      'One of the Pathway’s advanced certification routes is the Private Executive Advisory Practitioner Certification — based on a 16-module professional curriculum built around the Capacity Recalibration Model™ and the complete Private Executive Advisory client journey. Practitioners learn the methodology as an integrated professional system. The curriculum’s stages include:',
    modules: [
      { number: 1, title: 'Enquiry & Suitability' },
      { number: 2, title: 'Assessment' },
      { number: 3, title: 'Executive Capacity Audit' },
      { number: 4, title: 'Somatic Load Mapping' },
      { number: 5, title: 'Formulation' },
      { number: 6, title: 'Advisory Delivery' },
      { number: 7, title: 'Stabilisation' },
      { number: 8, title: 'Load Reorganisation' },
      { number: 9, title: 'Capacity Expansion' },
      { number: 10, title: 'Monitoring' },
      { number: 11, title: 'Final Review' },
      { number: 12, title: 'Continuation Planning' },
    ],
  },

  experience: {
    chapter: '05',
    heading: 'Learning Experience',
    features: [
      {
        title: 'Structured Educational Material',
        description:
          'Curriculum grounded in peer-reviewed research and more than twenty years of clinical observation — not therapeutic trend or anecdote.',
      },
      {
        title: 'Case-Based Learning & Simulations',
        description:
          'Case-based learning and simulations that let practitioners examine real-world application before working with clients directly.',
      },
      {
        title: 'Supervised Practice',
        description:
          'Trainees move from theoretical learning into practical application under appropriate supervision, developing confidence and receiving structured feedback.',
      },
      {
        title: 'Formal Assessment & Competency Review',
        description:
          'Assessment includes knowledge checks, case-based work, and formal competency assessment — course attendance alone is not regarded as sufficient evidence of readiness to practise.',
      },
    ],
  },

  outcomes: {
    chapter: '06',
    heading: 'Certification Outcomes',
    before: {
      label: 'Before Certification',
      items: [
        'Methodology understood, not yet formally assessed',
        'No supervised practice record',
        'No recognised scope of practice',
        'Working without Institute governance or supervision',
      ],
    },
    after: {
      label: 'After Certification',
      items: [
        'Formally assessed competency to deliver the methodology',
        'Supervised Practice Portfolio and ongoing supervision',
        'Listing on the TNSI Practitioner Registry',
        'Annual reapproval and continuing professional development',
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
        question: 'Who is eligible for this pathway?',
        answer:
          'Entry requires you to be an appropriately qualified clinician, holding the relevant licence, registration, regulation, or recognised professional standing for your discipline and jurisdiction — for example in psychotherapy, psychology, counselling, or healthcare, subject to the specific entry criteria for each certification programme.',
      },
      {
        question: 'What does the programme involve?',
        answer:
          'Structured theoretical education, formal assessment, practical application, and supervised practice, with attention to professional governance, client suitability, risk and safety, scope of practice, referral, documentation, and ethical decision-making. Programme details are provided as part of the Academy application process.',
      },
      {
        question: 'How long does it take?',
        answer:
          'Duration varies by certification programme. Programme details, including duration and structure, are provided as part of the Academy application process.',
      },
      {
        question: 'Will I receive certification?',
        answer:
          'Candidates who complete the required theoretical education, formal assessment, and supervised practice receive TNSI Practitioner Certification and may be listed on the TNSI Practitioner Registry, subject to ongoing supervision and annual reapproval requirements.',
      },
      {
        question: 'What is the TNSI Practitioner Registry?',
        answer:
          'A formal record of individuals recognised by the Institute as having completed an approved professional pathway — giving clients, organisations, and professionals a way to identify practitioners whose training status has been formally recognised by The Nervous System Institute.',
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
