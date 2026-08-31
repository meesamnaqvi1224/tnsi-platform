/**
 * About page content.
 *
 * Source: Caroline Reed's "TNSI Website Feedback" document (2026-08).
 * Copy is used as supplied — do not paraphrase or embellish.
 */

export const aboutContent = {
  slug: 'about',

  seo: {
    title: 'About — The Nervous System Institute',
    description:
      'The Nervous System Institute exists to advance human development through the science of the nervous system.',
  },

  purpose: {
    eyebrow: 'Our Purpose',
    headline: 'Science-led. Humanity-centred.',
    paragraphs: [
      'The Nervous System Institute exists to advance human development through the science of the nervous system.',
      'We believe that understanding how the nervous system shapes learning, adaptation, relationships, leadership, and participation has the potential to transform the way individuals, professionals, and organisations support human growth. Through research, education, and advisory, we develop evidence-informed frameworks that bridge scientific understanding with practical application, creating pathways for meaningful and sustainable development.',
    ],
  },

  institute: {
    eyebrow: 'The Institute',
    headline: 'Advancing the understanding of human development.',
    paragraphs: [
      'The Nervous System Institute is an education and advisory institute dedicated to advancing the practical understanding of human development through the science of the nervous system.',
      'Our work brings together insights from neuroscience, psychology, physiology, attachment, trauma science, education, and lived experience to create integrated frameworks that are intellectually rigorous, practically relevant, and accessible across personal, professional, and organisational settings.',
      'Rather than viewing human development through a single discipline, we believe meaningful progress emerges through integration. By connecting research with real-world application, we seek to deepen understanding, expand capacity, and support more meaningful participation across every stage of life.',
    ],
  },

  theoryTeaser: {
    eyebrow: 'Human Expansion Theory™',
    headline: 'A new framework for understanding human development.',
    paragraphs: [
      'The Human Expansion Theory™ is the conceptual foundation of The Nervous System Institute. It explores how the conditions surrounding an individual influence their capacity to grow, adapt, and participate throughout life.',
      'Rather than viewing regulation as the destination, the theory proposes that regulation creates the conditions from which development can continue. Through the developmental conditions of Safety, Capacity, Availability, Expansion, and Participation, the Human Expansion Theory offers a framework for understanding how individuals move beyond survival towards greater engagement with themselves, others, and the world around them.',
    ],
    cta: { label: 'Explore the Human Expansion Theory', href: '/method' },
  },

  principles: {
    eyebrow: 'Our Guiding Principles',
    headline: 'The philosophy that guides our work.',
    items: [
      {
        title: 'Human Development',
        description:
          'We believe every individual possesses the capacity to continue growing throughout life. Our work exists to create the conditions that support lifelong development, rather than simply responding to periods of difficulty.',
      },
      {
        title: 'Scientific Integrity',
        description:
          'We are committed to intellectual rigour, critical thinking, and the responsible application of scientific knowledge. We value evidence, remain open to new discoveries, and approach complexity with curiosity, humility, and honesty.',
      },
      {
        title: 'Integration',
        description:
          'Human experience cannot be understood through a single discipline. We integrate knowledge across neuroscience, psychology, physiology, education, attachment, trauma science, and lived experience to build coherent frameworks that honour the complexity of human development.',
      },
      {
        title: 'Meaningful Participation',
        description:
          'We believe the purpose of human development is not merely to overcome adversity, but to participate more fully in life. Everything we create is designed to help individuals, professionals, and organisations expand their capacity to engage, contribute, and flourish.',
      },
    ],
  },

  founder: {
    eyebrow: 'The Founder',
    name: 'Caroline Reed',
    title: 'Founder and Director of The Nervous System Institute',
    subtitle: 'Developer of Human Expansion Theory™',
    paragraphs: [
      'Caroline Reed is the Founder and Director of The Nervous System Institute and the developer of the Human Expansion Theory™.',
      "Drawing on more than two decades of clinical experience, postgraduate study, and ongoing research, Caroline's work brings together neuroscience, psychology, education, and human development into evidence-informed frameworks that support lasting change across individuals, professionals, and organisations.",
      'Her work explores the relationship between nervous system functioning, human capacity, and lifelong development, with a particular interest in how the conditions surrounding an individual shape their ability to learn, adapt, connect, lead, and participate in life.',
      'Through The Nervous System Institute, Caroline leads the development of educational programmes, professional training, original frameworks, and research initiatives dedicated to advancing the practical understanding of nervous system science.',
    ],
  },

  glance: {
    eyebrow: 'The Institute at a Glance',
    headline: 'Three pathways. One shared purpose.',
    items: [
      {
        title: 'For Individuals',
        description:
          'Structured educational pathways that support nervous system capacity, personal development, and meaningful participation in life.',
      },
      {
        title: 'For Professionals',
        description:
          'Evidence-informed education, certification, supervision, and continuing professional development for those seeking to deepen their understanding and practice.',
      },
      {
        title: 'For Organisations',
        description:
          'Strategic advisory, leadership development, and organisational frameworks that support sustainable performance, healthier cultures, and expanded capacity.',
      },
    ],
  },

  closing: {
    eyebrow: 'Closing Statement',
    headline: 'Advancing Human Development Through the Science of the Nervous System.',
    supportingCopy:
      'Whether supporting an individual, educating a professional, or partnering with an organisation, our purpose remains the same: to deepen understanding, expand capacity, and contribute to a future in which more people are able to participate fully in the opportunities and responsibilities of life.',
    cta: { label: 'Explore Our Work', href: '/programs' },
  },
} as const;

export type AboutContent = typeof aboutContent;
