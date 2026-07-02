/**
 * Faculty page content.
 *
 * Structured for future Sanity CMS integration — each top-level key maps to a
 * document field or portable-text block.
 */

export const facultyContent = {
  slug: 'faculty',

  seo: {
    title: 'Faculty — The Nervous System Institute',
    description:
      'Meet the educators, practitioners and researchers shaping The Nervous System Institute.',
  },

  hero: {
    chapter: '01',
    eyebrow: 'Institute Faculty',
    headline: 'Faculty',
    supportingHeadline:
      'Meet the educators, practitioners and researchers shaping The Nervous System Institute.',
    supportingCopy:
      'Our work combines decades of clinical practice, neuroscience, trauma recovery and education to create practical learning experiences that build lasting capacity.',
    imageSrc: '/images/faculty/hero-portrait.webp',
    imageAlt:
      'Editorial portrait photography — professional educator in warm natural light, academic setting.',
    primaryCta: { label: 'Meet Caroline Reed', href: '#founder' },
    secondaryCta: { label: 'Book Discovery Call', href: '/book-a-call' },
  },

  founder: {
    chapter: '02',
    id: 'founder',
    name: 'Caroline Reed',
    roles: [
      'Founder',
      'Trauma Recovery Specialist',
      '20+ Years Experience',
      'Master\u2019s Degree',
      'EMDR Practitioner',
      'Founder of the Life Beyond Trauma Method',
    ],
    imageSrc: '/images/faculty/founder-portrait.webp',
    imageAlt: 'Professional portrait of Caroline Reed — editorial treatment, natural daylight.',
    biography: [
      'Caroline Reed founded The Nervous System Institute after more than twenty years in clinical practice, during which she observed the same pattern repeatedly: capable people exhausting themselves not through lack of effort, but through a nervous system trained to override its own signals.',
      'Her clinical work spans trauma recovery, attachment-informed therapy and somatic practice — integrated not as competing modalities, but as a coherent methodology grounded in neuroscience and disciplined clinical observation.',
      'As an educator, Caroline has developed curricula for practitioners, leaders and individuals seeking sustainable change. Her teaching prioritises understanding before intervention: the belief that lasting capacity requires comprehension, not compliance.',
      'Her research interests include autonomic regulation, trauma physiology and the application of polyvagal theory in clinical and educational settings. She contributes to the Institute\u2019s evidence-informed framework and ongoing research initiatives.',
    ],
    closingQuote:
      'My goal is not simply to help people heal. It is to help them understand themselves deeply enough that healing becomes sustainable.',
  },

  expertise: {
    chapter: '03',
    heading: 'Areas of Expertise',
    items: [
      {
        id: 'trauma-recovery',
        title: 'Trauma Recovery',
        summary:
          'Evidence-informed approaches to trauma physiology, dissociation and the pathways toward regulation — drawn from decades of clinical practice and contemporary trauma research.',
        href: '/method',
        imageSrc: '/placeholders/discovery-hero.svg',
        imageAlt: 'Clinical consultation space with natural light and reference texts.',
        layout: 'image-left' as const,
      },
      {
        id: 'nervous-system-science',
        title: 'Nervous System Science',
        summary:
          'The physiological foundations of regulation, threat detection and autonomic state — translated from peer-reviewed neuroscience into practical educational frameworks.',
        href: '/research',
        imageSrc: '/placeholders/discovery-hero.svg',
        imageAlt: 'Neuroscience journals and annotated research notes.',
        layout: 'image-right' as const,
      },
      {
        id: 'practitioner-education',
        title: 'Practitioner Education',
        summary:
          'Structured certification and supervision for professionals integrating nervous system science into clinical, coaching and healthcare practice.',
        href: '/programs/practitioner-certification',
        imageSrc: '/placeholders/contact-hero.svg',
        imageAlt: 'Teaching materials and clinical notebooks in a quiet study.',
        layout: 'image-left' as const,
      },
      {
        id: 'leadership-development',
        title: 'Leadership Development',
        summary:
          'The physiology of executive capacity — how autonomic state shapes judgment, team dynamics and the hidden architecture of organisational culture.',
        href: '/programs/executive-advisory',
        imageSrc: '/placeholders/contact-hero.svg',
        imageAlt: 'Leadership research and quiet strategic consultation setting.',
        layout: 'image-right' as const,
      },
      {
        id: 'somatic-healing',
        title: 'Somatic Healing',
        summary:
          'Body-based approaches to regulation and integration — evaluated through clinical outcomes, physiological measurement and disciplined practitioner observation.',
        href: '/articles',
        imageSrc: '/placeholders/faculty-hero.svg',
        imageAlt: 'Somatic practice space with natural daylight.',
        layout: 'image-left' as const,
      },
    ],
  },

  teachingPhilosophy: {
    chapter: '04',
    headline: 'Education should create understanding before transformation.',
    paragraphs: [
      'The Nervous System Institute was founded on a simple conviction: people cannot sustain change they do not understand. Transformation without comprehension is temporary. Understanding without application is incomplete.',
      'Our educational philosophy integrates three sources of knowledge — scientific evidence, clinical observation and the lived experience of those we serve. None alone is sufficient. Together, they create learning that is rigorous, humane and practically applicable.',
      'We teach with curiosity rather than certainty. Every framework we share is held open to revision as research advances and clinical practice deepens. Education at TNSI is not a product to be consumed — it is a discipline to be practised over time.',
    ],
  },

  guestFaculty: {
    chapter: '05',
    heading: 'Guest Faculty',
    intro:
      'The Institute is designed to grow. While Caroline Reed is currently the primary educator, we are building relationships with specialists whose work complements our evidence-informed framework.',
    collaborationAreas: [
      'Researchers',
      'Healthcare professionals',
      'Medical practitioners',
      'Leadership specialists',
      'Guest educators',
      'Universities',
      'Professional organisations',
    ],
    supportingCopy:
      'Future guest faculty will contribute seminars, research collaborations and specialised modules — extending the Institute\u2019s reach without diluting its methodological integrity. We do not list faculty we have not yet engaged.',
    primaryCta: { label: 'Collaboration Enquiries', href: '/contact' },
    secondaryCta: { label: 'Research Partnerships', href: '/research' },
  },

  speaking: {
    chapter: '06',
    heading: 'Speaking & Partnerships',
    intro:
      'Caroline Reed is available for keynote addresses, institutional workshops and advisory engagements with organisations committed to evidence-informed human development.',
    audiences: [
      'Universities',
      'Healthcare systems',
      'Corporate organisations',
      'Leadership conferences',
      'Professional institutes',
    ],
    supportingCopy:
      'Speaking engagements are tailored to context — from academic symposia to executive leadership forums. Each presentation is grounded in research and clinical practice, not motivational rhetoric.',
    primaryCta: { label: 'Invite Caroline to Speak', href: 'mailto:partnerships@tnsi.org' },
    secondaryCta: { label: 'Contact the Institute', href: '/contact' },
  },

  closing: {
    chapter: '07',
    headline: 'Great institutions are built by people committed to lifelong learning.',
    supportingCopy:
      'Every educator at TNSI shares one commitment: Helping people build capacity through understanding.',
    primaryCta: { label: 'Book Discovery Call', href: '/book-a-call' },
    secondaryCta: { label: 'Contact Us', href: '/contact' },
  },

  footerQuote: {
    quote: 'The role of an educator is not to provide certainty, but to expand possibility.',
    author: 'Caroline Reed',
  },
} as const;

export type FacultyContent = typeof facultyContent;
export type FacultyExpertiseItem = (typeof facultyContent.expertise.items)[number];
