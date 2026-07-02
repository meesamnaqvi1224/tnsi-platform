/**
 * Research page content.
 *
 * Structured for future Sanity CMS integration — each top-level key maps to a
 * document field or portable-text block.
 */

export const researchContent = {
  slug: 'research',

  seo: {
    title: 'Research — The Nervous System Institute',
    description:
      'Exploring the science of the nervous system through evidence, clinical observation and practical application.',
  },

  hero: {
    chapter: '01',
    eyebrow: 'Institutional Research',
    headline: 'Research',
    supportingHeadline:
      'Exploring the science of the nervous system through evidence, clinical observation and practical application.',
    supportingCopy:
      'The Nervous System Institute brings together findings from neuroscience, psychology, attachment theory and somatic practice to create practical frameworks for sustainable human change.',
    imageAlt:
      'Editorial photograph — research papers, neuroscience journals and notebook in natural daylight.',
    primaryCta: { label: 'Explore Publications', href: '#references' },
    secondaryCta: { label: 'Research Principles', href: '#philosophy' },
  },

  philosophy: {
    chapter: '02',
    id: 'philosophy',
    heading: 'Evidence before opinion.',
    paragraphs: [
      'Evidence matters because human suffering is too consequential to be addressed through intuition alone. The nervous system is a biological system — and biological systems respond to interventions that respect their architecture.',
      'Neuroscience alone is not enough. Neural mechanisms do not translate automatically into clinical wisdom. Laboratory findings require interpretation, context and the disciplined observation of what happens when theory meets a real person in a real room.',
      'Clinical experience matters because practitioners encounter complexity that no single study can contain. Fifteen years at the bedside teaches patterns that meta-analyses cannot fully capture — provided that experience is held accountable to evidence rather than anecdote.',
      'Lived experience matters because the people we serve are not data points. Their bodies carry histories that research is still learning to measure. Honouring that experience is not anti-scientific — it is scientifically necessary.',
      'The Nervous System Institute integrates neuroscience, attachment theory, trauma psychology and somatic practice because no single discipline holds the full picture. Integration is not eclecticism. It is intellectual honesty.',
    ],
    closing:
      'We believe meaningful education happens when scientific evidence, clinical observation and human experience meet.',
  },

  pillars: {
    chapter: '03',
    heading: 'Research Pillars',
    items: [
      {
        id: 'neuroscience',
        title: 'Neuroscience',
        description:
          'The physiological foundations of regulation, threat detection and autonomic state — drawn from peer-reviewed literature and translated for clinical and educational application.',
        statistic: '40+ peer-reviewed sources integrated',
      },
      {
        id: 'attachment-theory',
        title: 'Attachment Theory',
        description:
          'How early relational experience shapes nervous system development, co-regulation capacity and the architecture of safety across the lifespan.',
        statistic: '25 years of attachment research reviewed',
      },
      {
        id: 'trauma-psychology',
        title: 'Trauma Psychology',
        description:
          'The intersection of trauma physiology, memory, dissociation and recovery — informed by clinical research and decades of trauma-informed practice.',
        statistic: '15+ trauma-specific frameworks examined',
      },
      {
        id: 'somatic-practice',
        title: 'Somatic Practice',
        description:
          'Body-based approaches to regulation and healing — evaluated through clinical outcomes, physiological measurement and practitioner observation.',
        statistic: '12 somatic modalities cross-referenced',
      },
    ],
  },

  areas: {
    chapter: '04',
    heading: 'Areas of Investigation',
    items: [
      {
        id: 'regulation',
        title: 'Nervous System Regulation',
        summary:
          'How autonomic state shapes daily functioning, relational capacity and the physiological prerequisites for learning and change.',
        href: '/articles',
        imageAlt: 'Research journal open beside handwritten clinical notes.',
        layout: 'image-left' as const,
      },
      {
        id: 'high-performance',
        title: 'High Performance',
        summary:
          'The physiology of sustained excellence — examining capacity, recovery and the nervous system conditions that support performance without depletion.',
        href: '/articles',
        imageAlt: 'Executive notebook and reference texts on a wooden desk.',
        layout: 'image-right' as const,
      },
      {
        id: 'trauma-recovery',
        title: 'Trauma Recovery',
        summary:
          'Evidence-informed pathways through trauma physiology toward regulation, integration and long-term wellbeing.',
        href: '/articles',
        imageAlt: 'Quiet clinical consultation space with natural light.',
        layout: 'image-left' as const,
      },
      {
        id: 'leadership-capacity',
        title: 'Leadership Capacity',
        summary:
          'How nervous system state influences executive judgment, team dynamics and the hidden physiology of organisational culture.',
        href: '/articles',
        imageAlt: 'Leadership research papers and annotated margins.',
        layout: 'image-right' as const,
      },
      {
        id: 'emotional-safety',
        title: 'Emotional Safety',
        summary:
          'Neuroception, safety cues and the relational conditions required for psychological safety in clinical, educational and organisational settings.',
        href: '/articles',
        imageAlt: 'Two chairs in a calm therapeutic environment.',
        layout: 'image-left' as const,
      },
      {
        id: 'burnout-prevention',
        title: 'Burnout Prevention',
        summary:
          'The autonomic mechanisms underlying chronic stress, exhaustion and collapse — and the frameworks that address root physiology rather than symptoms alone.',
        href: '/articles',
        imageAlt: 'Stacked volumes beside a window with soft daylight.',
        layout: 'image-right' as const,
      },
    ],
  },

  timeline: {
    chapter: '05',
    heading: 'Evidence Timeline',
    intro:
      'A selective chronology of the research traditions that inform the Institute\u2019s educational frameworks.',
    events: [
      {
        era: '1980s',
        title: 'Trauma research expands',
        description:
          'PTSD formally recognised; trauma physiology enters mainstream clinical discourse.',
      },
      {
        era: '1990s',
        title: 'Polyvagal Theory introduced',
        description:
          'Stephen Porges articulates the neurophysiological foundations of social engagement and safety.',
      },
      {
        era: '2000s',
        title: 'Advances in attachment science',
        description:
          'Neurobiological attachment research bridges developmental psychology and clinical practice.',
      },
      {
        era: '2010s',
        title: 'Growth of somatic therapies',
        description:
          'Body-based approaches gain empirical scrutiny and integration with trauma-informed care.',
      },
      {
        era: 'Today',
        title: 'The Life Beyond Trauma Method',
        description:
          'TNSI synthesises decades of research into an evidence-informed framework for sustainable human change.',
      },
    ],
  },

  references: {
    chapter: '06',
    id: 'references',
    heading: 'Selected References',
    intro:
      'Representative sources informing the Institute\u2019s educational frameworks. This is not an exhaustive bibliography.',
    items: [
      {
        author: 'Stephen Porges',
        year: '2011',
        publication:
          'The Polyvagal Theory: Neurophysiological Foundations of Emotions, Attachment, Communication, and Self-Regulation',
        category: 'Neuroscience',
      },
      {
        author: 'Bessel van der Kolk',
        year: '2014',
        publication: 'The Body Keeps the Score: Brain, Mind, and Body in the Healing of Trauma',
        category: 'Trauma Psychology',
      },
      {
        author: 'Dan Siegel',
        year: '2012',
        publication:
          'The Developing Mind: How Relationships and the Brain Interact to Shape Who We Are',
        category: 'Attachment Theory',
      },
      {
        author: 'Peter Levine',
        year: '1997',
        publication: 'Waking the Tiger: Healing Trauma',
        category: 'Somatic Practice',
      },
      {
        author: 'Deb Dana',
        year: '2018',
        publication: 'The Polyvagal Theory in Therapy: Engaging the Rhythm of Regulation',
        category: 'Clinical Application',
      },
      {
        author: 'Bruce Perry',
        year: '2017',
        publication:
          'The Boy Who Was Raised as a Dog — and Other Stories from a Child Psychiatrist\u2019s Notebook',
        category: 'Trauma Psychology',
      },
      {
        author: 'Stephen Porges & Deb Dana',
        year: '2020',
        publication: 'Polyvagal Exercises for Safety and Connection',
        category: 'Neuroscience',
      },
      {
        author: 'Dan Siegel & Tina Payne Bryson',
        year: '2011',
        publication:
          'The Whole-Brain Child: 12 Revolutionary Strategies to Nurture Your Child\u2019s Developing Mind',
        category: 'Attachment Theory',
      },
      {
        author: 'Bessel van der Kolk',
        year: '2006',
        publication: 'Clinical implications of neuroscience research in PTSD',
        category: 'Research',
      },
      {
        author: 'Peter Levine',
        year: '2010',
        publication: 'In an Unspoken Voice: How the Body Releases Trauma and Restores Goodness',
        category: 'Somatic Practice',
      },
    ],
  },

  initiatives: {
    chapter: '07',
    heading: 'Current Research Initiatives',
    items: [
      {
        id: 'clinical-observation',
        title: 'Clinical Observation',
        description:
          'Ongoing documentation of nervous system-informed interventions across clinical settings — tracking patterns, outcomes and practitioner observations.',
        status: 'Active — data collection phase',
        futurePublication: 'Clinical Observation Report — anticipated 2027',
      },
      {
        id: 'educational-outcomes',
        title: 'Educational Outcomes',
        description:
          'Evaluating practitioner and participant outcomes across TNSI certification and educational programmes.',
        status: 'Active — longitudinal study',
        futurePublication: 'Educational Outcomes White Paper — anticipated 2027',
      },
      {
        id: 'leadership-capacity',
        title: 'Leadership Capacity',
        description:
          'Investigating the relationship between autonomic regulation, executive decision-making and organisational culture in senior leadership contexts.',
        status: 'Planning — advisory cohort forming',
        futurePublication: 'Leadership Capacity Study — anticipated 2028',
      },
    ],
  },

  faq: {
    chapter: '08',
    heading: 'Frequently Asked Questions',
    items: [
      {
        question: 'How does TNSI evaluate research?',
        answer:
          'We assess research through a multi-criteria framework: peer-review status, replication evidence, clinical applicability, and consistency with observed outcomes in practice. Sources that fail any criterion are noted as limitations rather than suppressed.',
      },
      {
        question: 'Is the Life Beyond Trauma Method evidence-informed?',
        answer:
          'Yes. The Method integrates findings from neuroscience, attachment theory, trauma psychology and somatic practice. It is evidence-informed — meaning it is grounded in research while acknowledging that not every element has been validated through randomised controlled trials.',
      },
      {
        question: 'Does TNSI publish research?',
        answer:
          'The Institute publishes educational articles, research summaries and clinical guides. Formal research publications — including white papers and outcome studies — are in development as part of our current research initiatives.',
      },
      {
        question: 'How are new findings integrated?',
        answer:
          'New peer-reviewed findings are reviewed quarterly by the Institute\u2019s educational faculty. Where findings substantively change clinical recommendations, curriculum and published materials are updated accordingly.',
      },
      {
        question: 'What makes this approach different?',
        answer:
          'Most approaches privilege a single discipline — neuroscience alone, or somatics alone, or attachment theory alone. TNSI integrates multiple evidence bases and holds them accountable to clinical observation and lived experience. Integration with accountability is the distinguishing commitment.',
      },
    ],
  },

  closing: {
    chapter: '09',
    headline: 'Knowledge becomes meaningful when it improves human lives.',
    supportingCopy:
      'Every programme, article and educational experience developed by The Nervous System Institute begins with one commitment: Understand deeply. Teach responsibly. Continue learning.',
    primaryCta: { label: 'Explore Articles', href: '/articles' },
    secondaryCta: { label: 'View Programs', href: '/programs' },
  },

  footerQuote: {
    quote: 'The best education is always willing to evolve.',
    author: 'Caroline Reed',
  },
} as const;

export type ResearchContent = typeof researchContent;
export type ResearchPillarItem = (typeof researchContent.pillars.items)[number];
export type ResearchAreaItem = (typeof researchContent.areas.items)[number];
export type ResearchReference = (typeof researchContent.references.items)[number];
export type ResearchInitiativeItem = (typeof researchContent.initiatives.items)[number];
