/**
 * Our Pathways page content (served at the existing /programs route —
 * URL preserved for stability; only the page's visible positioning changes).
 *
 * Source: Caroline Reed's "TNSI Website Feedback" document (2026-08).
 * Copy is used as supplied — do not paraphrase or embellish.
 *
 * "Four vs five pathways" discrepancy: Caroline's supplied introduction says
 * "four evidence-informed pathways" but then names five (Regulation Suite,
 * Life Beyond Trauma, Nervous System Academy, Executive Advisory,
 * Organisational Advisory). Per implementation instructions, the numeral is
 * not hardcoded here — it would visibly contradict the five pathway panels
 * rendered below it. Flagged for Caroline's review; not resolved silently.
 * Batch B: still numberless, unchanged, per explicit instruction not to
 * reintroduce "four" or invent "five" without her confirmation.
 *
 * `category` values match Batch B's confirmed architecture tree — For
 * Individuals / For Professionals / For Leaders / For Organisations — each
 * pathway's `cta.href` now points at its own dedicated page (Batch B) rather
 * than /method or a generic /book-a-call placeholder (Batch A interim).
 *
 * `comparison` is retained unchanged (old 3-programme model) purely so
 * `content/cms/loaders.ts` — Sanity-adjacent glue this batch does not touch —
 * keeps compiling. It is no longer rendered on this page.
 */

export const programsOverviewContent = {
  hero: {
    eyebrow: 'Our Pathways',
    headline: 'Choose Your Pathway',
    supportingCopy:
      'The Nervous System Institute offers evidence-informed pathways that support human development across personal growth, professional practice, executive leadership, and organisational development. Each pathway applies the principles of Human Expansion Theory™ within a different context while sharing the same commitment to scientific integrity, practical application, and meaningful participation.',
    primaryCta: { label: 'Explore Pathways', href: '#pathways' },
    imageSrc: '/images/programs/overview-hero.webp',
    imageAlt:
      'A modern low-rise education building of oak and stone set among trees in soft evening light.',
  },

  pathways: [
    {
      id: 'regulation-suite',
      category: 'For Individuals',
      title: 'The Regulation Suite™',
      tagline: 'Build capacity. One practice at a time.',
      paragraphs: [
        "The Regulation Suite™ is the Institute's membership and daily learning environment. Designed for individuals who want to better understand their nervous system and develop greater capacity in everyday life, it provides a growing library of practical tools, guided practices, workshops, and educational resources grounded in Human Expansion Theory™.",
        "Whether you're learning to regulate more effectively, build resilience, reconnect with yourself, or strengthen your capacity over time, the Regulation Suite offers ongoing support that fits into everyday life.",
      ],
      idealFor: [
        'Individuals beginning their nervous system education',
        'Ongoing personal development',
        'Daily regulation and capacity-building',
        'Maintaining progress after Life Beyond Trauma™',
      ],
      cta: { label: 'Explore the Regulation Suite', href: '/programs/regulation-suite' },
    },
    {
      id: 'life-beyond-trauma',
      category: 'For Individuals',
      title: 'Life Beyond Trauma™',
      tagline: 'A structured pathway for lasting human development.',
      paragraphs: [
        "Life Beyond Trauma™ is the Institute's flagship educational pathway for individuals seeking deeper and more sustained change.",
        'Grounded in the Capacity Recalibration Model™ and informed by Human Expansion Theory™, it helps participants understand the protective patterns that have shaped their lives while developing the capacity to participate more fully in relationships, work, purpose, and everyday living.',
        'Rather than focusing solely on symptom management, Life Beyond Trauma™ supports the gradual transition from lives organised around protection to lives characterised by greater flexibility, capacity, and meaningful participation.',
      ],
      idealFor: [
        'Individuals seeking deeper personal development',
        'People living beyond their available capacity',
        'Those wanting structured education rather than symptom management',
        'Individuals committed to long-term growth',
      ],
      cta: { label: 'Explore Life Beyond Trauma', href: '/programs/life-beyond-trauma' },
    },
    {
      id: 'nervous-system-academy',
      category: 'For Professionals',
      title: 'The Nervous System Academy',
      tagline: 'Professional education for those who support others.',
      paragraphs: [
        'The Nervous System Academy provides evidence-informed education for therapists, coaches, healthcare professionals, educators, and other practitioners who want to integrate nervous system science into their work.',
        'Through certification, continuing professional development, supervision, and advanced learning, the Academy equips professionals with practical frameworks that bridge scientific understanding with real-world application.',
        "The Academy exists not simply to teach techniques, but to cultivate thoughtful practitioners who can confidently apply Human Expansion Theory™ and the Institute's educational frameworks within their own professional settings.",
      ],
      idealFor: [
        'Therapists',
        'Psychologists',
        'Coaches',
        'Healthcare professionals',
        'Educators',
        'Helping professionals',
      ],
      cta: { label: 'Explore the Academy', href: '/programs/academy' },
      relatedCta: {
        label:
          'Our current certification programme, Practitioner Certification, is available today.',
        href: '/programs/practitioner-certification',
      },
    },
    {
      id: 'executive-advisory',
      category: 'For Leaders',
      title: 'Executive Advisory',
      tagline: 'Building leadership capacity under sustained pressure.',
      paragraphs: [
        'Executive Advisory supports founders, senior leaders, and executives operating in environments of sustained complexity and responsibility.',
        'Rather than focusing solely on stress management or executive performance, our advisory work helps leaders build the internal capacity required to navigate increasing complexity, make clearer decisions, sustain high performance, and lead from a place of greater physiological flexibility.',
        'Through confidential one-to-one advisory, leaders develop the conditions that enable long-term effectiveness without becoming increasingly organised around protection.',
      ],
      idealFor: [
        'Founders',
        'CEOs',
        'Senior executives',
        'Leadership teams',
        'High-responsibility decision-makers',
      ],
      cta: { label: 'Explore Executive Advisory', href: '/programs/executive-advisory' },
    },
    {
      id: 'organisational-advisory',
      category: 'For Organisations',
      title: 'Organisational Advisory',
      tagline: 'Creating organisations where people can thrive.',
      paragraphs: [
        'Organisational Advisory helps organisations apply nervous system science to leadership, culture, and organisational development.',
        'Working alongside leadership teams, we translate Human Expansion Theory™ into practical strategies that strengthen organisational capacity, improve communication, support healthier cultures, and create environments where people can contribute more effectively over time.',
        'Our focus extends beyond individual wellbeing to the development of resilient systems that enable sustainable organisational performance.',
      ],
      idealFor: [
        'Organisations',
        'Leadership teams',
        'Public sector',
        'Healthcare',
        'Education',
        'Corporate organisations',
      ],
      cta: { label: 'Explore Organisational Advisory', href: '/programs/organisational-advisory' },
    },
  ] as const,

  /** Group order for the Our Pathways page — matches the confirmed architecture tree. */
  pathwayGroups: [
    'For Individuals',
    'For Professionals',
    'For Leaders',
    'For Organisations',
  ] as const,

  comparison: [
    {
      title: 'Life Beyond Trauma',
      audience: 'Individuals',
      format: 'Live group programme',
      duration: 'Ongoing cohorts',
      outcome: 'Regulated nervous system, expanded capacity',
      href: '/programs/life-beyond-trauma',
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

export type ProgramsOverviewContent = typeof programsOverviewContent;
export type PathwayItem = (typeof programsOverviewContent.pathways)[number];
export type PathwayId = PathwayItem['id'];

/**
 * Looks up a single pathway's approved copy by id — used by each pathway's
 * dedicated page so its content stays sourced from the same place as the
 * Our Pathways hub, rather than being duplicated.
 */
export function getPathway(id: PathwayId): PathwayItem {
  const pathway = programsOverviewContent.pathways.find((item) => item.id === id);
  if (!pathway) {
    throw new Error(`Unknown pathway id: ${id}`);
  }
  return pathway;
}
