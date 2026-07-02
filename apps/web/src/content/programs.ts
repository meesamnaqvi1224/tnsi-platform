export const programsOverviewContent = {
  hero: {
    eyebrow: 'Programs',
    headline: 'Choose your pathway.',
    supportingCopy:
      'Three evidence-informed programs — each designed for a different stage of transformation.',
    primaryCta: { label: 'Explore Programs', href: '#pathways' },
    imageSrc: '/images/programs/hero-landscape.webp',
    imageAlt:
      'Caroline Reed at her desk in a professional office setting, representing Institute programmes.',
  },

  navigation: [
    {
      id: 'life-beyond-trauma',
      title: 'Life Beyond Trauma',
      description:
        'For ambitious women ready to move beyond survival and reclaim lasting wellbeing.',
      href: '/method',
      cta: 'Explore',
      imageSrc: '/images/programs/life-beyond-trauma/navigation-card.webp',
      imageAlt: 'Caroline Reed in a warm editorial portrait for Life Beyond Trauma.',
    },
    {
      id: 'practitioner-certification',
      title: 'Practitioner Certification',
      description:
        'For professionals integrating trauma-informed nervous system education into practice.',
      href: '/programs/practitioner-certification',
      cta: 'Explore',
      imageSrc: '/images/programs/practitioner/hero-workshop.webp',
      imageAlt: 'Caroline Reed in a professional portrait for Practitioner Certification.',
    },
    {
      id: 'executive-advisory',
      title: 'Executive Advisory',
      description: 'For organisations building healthier leadership and workplace cultures.',
      href: '/programs/executive-advisory',
      cta: 'Explore',
      imageSrc: '/images/programs/executive/hero-meeting.webp',
      imageAlt: 'Caroline Reed in an executive portrait for Executive Advisory.',
    },
  ] as const,

  featured: [
    {
      id: 'life-beyond-trauma',
      eyebrow: 'Personal',
      title: 'Life Beyond Trauma',
      description:
        'A structured transformational journey combining neuroscience, trauma recovery, nervous system regulation and practical application.',
      details: [
        { label: 'Format', value: 'Live group programme with coaching support' },
        { label: 'Duration', value: 'Ongoing cohorts' },
        { label: 'Outcome', value: 'Regulated nervous system and expanded capacity' },
      ],
      href: '/method',
      cta: 'Explore Program',
      imageSrc: '/images/programs/life-beyond-trauma/featured-program.webp',
      imageAlt: 'Caroline Reed in a joyful editorial portrait for Life Beyond Trauma.',
      layout: 'image-left' as const,
    },
    {
      id: 'practitioner-certification',
      eyebrow: 'Professional',
      title: 'Practitioner Certification',
      description:
        'A certifiable curriculum grounded in clinical research — structured for professionals who want to bring nervous system science into their practice.',
      details: [
        { label: 'Format', value: 'Structured certification curriculum' },
        { label: 'Duration', value: 'One year' },
        { label: 'Outcome', value: 'Certifiable trauma-informed education' },
      ],
      href: '/programs/practitioner-certification',
      cta: 'Explore Program',
      imageSrc: '/images/programs/practitioner/hero-workshop.webp',
      imageAlt: 'Caroline Reed in a professional teaching portrait for Practitioner Certification.',
      layout: 'image-right' as const,
    },
    {
      id: 'executive-advisory',
      eyebrow: 'Organisational',
      title: 'Executive Advisory',
      description:
        'Private advisory bespoke to each organisation — addressing the physiological dimension of leadership, culture and sustainable performance.',
      details: [
        { label: 'Format', value: 'Private advisory engagement' },
        { label: 'Duration', value: 'Ongoing' },
        { label: 'Outcome', value: 'Healthier leadership culture' },
      ],
      href: '/programs/executive-advisory',
      cta: 'Explore Advisory',
      imageSrc: '/images/programs/executive/hero-meeting.webp',
      imageAlt: 'Caroline Reed in an executive leadership portrait for Executive Advisory.',
      layout: 'image-left' as const,
    },
  ] as const,

  comparison: [
    {
      title: 'Life Beyond Trauma',
      audience: 'Individuals',
      format: 'Live group programme',
      duration: 'Ongoing cohorts',
      outcome: 'Regulated nervous system, expanded capacity',
      href: '/method',
    },
    {
      title: 'Practitioner Certification',
      audience: 'Professionals',
      format: 'Certification curriculum',
      duration: 'One year',
      outcome: 'Certifiable nervous system education',
      href: '/programs/practitioner-certification',
    },
    {
      title: 'Executive Advisory',
      audience: 'Organisations',
      format: 'Private advisory',
      duration: 'Ongoing engagement',
      outcome: 'Healthier leadership culture',
      href: '/programs/executive-advisory',
    },
  ] as const,
} as const;
