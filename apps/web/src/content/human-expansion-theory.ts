/**
 * Human Expansion Theory™ page content (served at the existing /method route —
 * URL preserved for stability; only the page's visible identity changes).
 *
 * Source: Caroline Reed's "TNSI Website Feedback" document (2026-08).
 * Copy is used as supplied — do not paraphrase or embellish.
 *
 * Typo note: Caroline's source reads "participation-cantered framework" —
 * corrected to "centred" (British spelling used consistently elsewhere across
 * the site) as an obvious one-letter typo, not a content change. Flagged for
 * her review in the implementation report.
 */

export const humanExpansionTheoryContent = {
  slug: 'human-expansion-theory',

  seo: {
    title: 'Human Expansion Theory™ — The Nervous System Institute',
    description:
      'A participation-centred framework for understanding human development — the intellectual foundation of The Nervous System Institute.',
  },

  hero: {
    eyebrow: 'Human Expansion Theory™',
    headline: 'Human Expansion Theory™',
    tagline: 'A participation-centred framework for understanding human development.',
    paragraphs: [
      'The Human Expansion Theory™ is the intellectual foundation of The Nervous System Institute. It proposes that the purpose of human development is to participate more fully in life rather than to simply survive, regulate, recover, or perform.',
      'Drawing together insights from neuroscience, psychology, attachment theory, developmental science, physiology, and trauma research, the theory offers an integrated framework for understanding how people grow throughout the lifespan and the conditions that enable meaningful participation.',
    ],
    cta: { label: 'Explore the Theory', href: '#why-a-new-framework' },
  },

  whyNewFramework: {
    chapter: 'I',
    heading: 'Why a New Framework?',
    paragraphs: [
      'Over the past century, our understanding of the human mind has advanced significantly. Psychology has deepened our understanding of behaviour, neuroscience has revealed the remarkable adaptability of the brain, attachment theory has transformed how we think about relationships, and trauma science has expanded our appreciation of how adversity shapes development.',
      'Yet these advances have often remained fragmented across disciplines.',
      'Human Expansion Theory™ was developed to bring these perspectives together within a single developmental framework — one that asks not only how people survive, but how they come to participate fully in life.',
    ],
  },

  centralProposition: {
    chapter: 'II',
    heading: 'The Central Proposition',
    statement:
      'Human Expansion Theory™ proposes that participation is the central expression of human development.',
    paragraphs: [
      'Human beings do not develop simply to function, recover, or regulate. They develop so they can increasingly engage with the opportunities, relationships, responsibilities, creativity, and purpose that life offers.',
      'From this perspective, regulation is not the destination. It is one of the developmental conditions that makes meaningful participation possible.',
    ],
  },

  developmentalConditions: {
    chapter: 'III',
    heading: 'The Five Developmental Conditions™',
    intro:
      "The theory is organised around five interdependent developmental conditions that shape an individual's ability to participate in life.",
    items: [
      {
        title: 'Safety',
        description:
          'The experience of sufficient security for developmental resources to move beyond protection.',
      },
      {
        title: 'Capacity',
        description:
          'The ability to hold increasing complexity, emotion, responsibility, and challenge without becoming increasingly organised around protection.',
      },
      {
        title: 'Availability',
        description:
          'The ability to access oneself, others, and the opportunities available within life.',
      },
      {
        title: 'Expansion',
        description:
          'The progressive development of greater possibility, complexity, and contribution.',
      },
      {
        title: 'Participation',
        description:
          'The lived expression of the preceding four conditions — engaging more fully with life through connection, purpose, creativity, contribution, and growth.',
      },
    ],
  },

  polyvagalFigure: {
    caption:
      'The Polyvagal Hierarchy — three levels of the autonomic nervous system and their corresponding physiological and behavioural states. The method is designed to cultivate reliable access to the ventral vagal system (social engagement), not to eliminate the mobilisation or shutdown responses, which remain necessary adaptive capacities.',
    source:
      'Porges, S.W. (2011). The Polyvagal Theory: Neurophysiological Foundations of Emotions, Attachment, Communication, and Self-Regulation. W.W. Norton.',
  },

  protectionParticipation: {
    chapter: 'IV',
    heading: 'Protection and Participation',
    intro:
      'Human Expansion Theory™ distinguishes between two fundamental developmental orientations.',
    protection: {
      title: 'Protection',
      description:
        'Protection represents the adaptive allocation of finite resources towards safety, predictability, and survival.',
    },
    participation: {
      title: 'Participation',
      description:
        'Participation represents the allocation of those same resources towards engagement, exploration, learning, connection, creativity, leadership, and contribution.',
    },
    closing:
      'The aim of development is not to eliminate protection. It is to create the conditions that allow progressively greater investment in participation.',
  },

  theoryToPractice: {
    chapter: 'V',
    heading: 'From Theory to Practice',
    paragraphs: [
      'The Human Expansion Theory™ provides the conceptual framework that underpins every aspect of The Nervous System Institute.',
      'Its principles are translated into practice through our educational pathways, professional training, and organisational advisory.',
      'Whether supporting an individual rebuilding capacity, educating a practitioner, or working alongside organisational leaders, every programme within the Institute is informed by the same developmental framework.',
    ],
    pathways: [
      {
        title: 'Life Beyond Trauma™',
        description:
          'A structured educational pathway for individuals seeking to increase capacity and participation in everyday life.',
      },
      {
        title: 'The Regulation Suite™',
        description:
          'Daily practices and tools designed to support nervous system capacity and ongoing development.',
      },
      {
        title: 'The Nervous System Academy',
        description:
          'Professional education, certification, supervision, and continuing development for practitioners.',
      },
      {
        title: 'Executive Advisory',
        description:
          'Strategic advisory supporting leaders and organisations in creating environments that enable sustainable human development.',
      },
    ],
  },

  evolving: {
    chapter: 'VI',
    heading: 'An Evolving Body of Work',
    paragraphs: [
      'Human Expansion Theory™ is an evolving framework. The Institute is committed to its continued development through research, academic collaboration, education, and practical application across clinical, educational, and organisational settings.',
      'Our aim is to contribute to a deeper understanding of the conditions that enable people not simply to survive — but to participate more fully in life.',
    ],
  },

  finalCta: {
    heading: 'Explore the Institute',
    supportingCopy:
      'Discover how Human Expansion Theory™ is translated into education, professional development, and organisational practice through the work of The Nervous System Institute.',
    cta: { label: 'Explore the Institute', href: '/about' },
  },

  quote: {
    quote:
      "The more I listened to people's stories, the more I realized I was asking the wrong question. I wasn't interested in why people struggled anymore. I wanted to understand what allowed them to expand.",
    author: 'Caroline Reed',
  },
} as const;

export type HumanExpansionTheoryContent = typeof humanExpansionTheoryContent;
