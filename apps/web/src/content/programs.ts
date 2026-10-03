/**
 * Our Pathways page content (served at the existing /programs route —
 * URL preserved for stability; only the page's visible positioning changes).
 *
 * Source: Caroline Reed's "TNSI - Program Summaries.docx" (2026-09), the
 * current source of truth for programme structure and content, superseding
 * the earlier "TNSI Website Feedback" pass. Two programmes were renamed to
 * match that document's actual programme names: "Executive Advisory" ->
 * "Private Executive Advisory", and "Organisational Advisory" ->
 * "System-Level Executive Advisory" (kept live per explicit owner
 * instruction, overriding the source document's own "program design in
 * process" note on that one programme). Route paths (`id`, `cta.href`) are
 * unchanged - renaming URLs was out of scope and not worth the migration
 * risk for a content-only update.
 *
 * "Four vs five pathways" discrepancy: an earlier draft of Caroline's intro
 * copy said "four evidence-informed pathways" but named five. The numeral is
 * not hardcoded here — it would visibly contradict the five pathway panels
 * rendered below it. Flagged for Caroline's review; not resolved silently.
 *
 * `category` values match the confirmed architecture tree — For
 * Individuals / For Professionals / For Leaders / For Organisations — each
 * pathway's `cta.href` points at its own dedicated page.
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
      tagline: 'Practical nervous-system support, whenever you need it.',
      paragraphs: [
        "The Regulation Suite™ is a digital nervous-system support platform — delivered through a subscription app and digital membership — designed to help you understand what's happening in your nervous system and find an appropriate response in the moment, without needing to work through complex theory first.",
        'State-based navigation (Calm My System, Feel Grounded, Release Pressure, Reconnect With Myself, Build Capacity) moves you quickly towards relevant support — from PowerDrops™, brief interventions designed for immediate use in moments of pressure or overwhelm, to longer-form somatic regulation practices, guided exercises, meditation and visualisation, and body-based tools.',
        'It supports both immediate regulation and longer-term capacity awareness, and is not a replacement for clinical treatment, crisis intervention, or specialist mental health care.',
        // Pricing per Caroline's source document, stated here as informational
        // content only — the enrolment status below (and the page's own CTA
        // section) is unchanged, since no live subscription/entitlement flow
        // exists yet for this product (see docs/membership-commercial-decisions.md).
        'The current model is priced at £5.99 per month, with the ability to cancel at any time.',
      ],
      idealFor: [
        'People experiencing everyday stress, overwhelm or reduced capacity',
        'Immediate, practical regulation support',
        'Building longer-term nervous-system awareness',
        'An accessible entry point before deciding on a more structured programme such as The Life Beyond Trauma Method™',
      ],
      cta: { label: 'Explore the Regulation Suite', href: '/programs/regulation-suite' },
      imageSrc: '/images/programs/nav-regulation-suite.webp',
      imageAlt:
        'An open blank notebook and pencil beside a small succulent plant on a wooden table.',
      heroImageSrc: '/images/programs/regulation-suite/hero-journal.webp',
      heroImageAlt: 'A woman in a cream cardigan pauses thoughtfully by a window, journal in hand.',
    },
    {
      id: 'life-beyond-trauma',
      category: 'For Individuals',
      title: 'The Life Beyond Trauma Method™',
      tagline: 'A structured 12-week trauma-informed programme.',
      paragraphs: [
        'The Life Beyond Trauma Method™ is a structured 12-week trauma-informed therapeutic and educational programme for adults whose experiences of trauma, adversity, chronic stress, or long-standing protective patterns continue to affect their emotional wellbeing, nervous-system regulation, relationships, and everyday functioning.',
        'It combines psychoeducation, nervous-system education, guided reflection, practical exercises, structured self-paced learning, and weekly facilitated group support. Participants are not required to disclose detailed traumatic experiences — the emphasis is on education, reflection, understanding, and practical application.',
        'Participants retain lifetime access to the core programme materials. Intended outcomes include a greater understanding of trauma and nervous-system responses, awareness of stress patterns and protective behaviours, and clearer plans for continued development. The programme is therapeutic and educational in nature and does not guarantee a particular clinical outcome.',
      ],
      idealFor: [
        'Adults affected by trauma, adversity or chronic stress',
        'People who remain outwardly functional while under significant internal strain',
        'Those who want structured education without repeated disclosure',
        'Individuals committed to long-term, trauma-informed development',
      ],
      cta: { label: 'Explore the Life Beyond Trauma Method', href: '/programs/life-beyond-trauma' },
      imageSrc: '/images/programs/nav-life-beyond-trauma.webp',
      imageAlt:
        'A woman in a cream sweater walks alone along a winding path through a sunlit forest.',
      heroImageSrc: '/images/programs/life-beyond-trauma/hero.webp',
      heroImageAlt: 'Sunbeams breaking through a green forest canopy onto a quiet dirt path.',
      externalCta: {
        label: 'Visit Life Beyond Trauma',
        href: 'https://lifebeyondtrauma.co.uk',
      },
    },
    {
      id: 'nervous-system-academy',
      category: 'For Professionals',
      title: 'The Nervous System Academy',
      tagline: 'Education, training, certification and practitioner development.',
      paragraphs: [
        'The Nervous System Academy is the education, training, certification, and practitioner-development arm of The Nervous System Institute — structured around three defined routes: the CPD Pathway, the Life Beyond Trauma Coaching Certificate, and the Practitioner Certification Pathway.',
        'The CPD Pathway provides specialist continuing education without certification in a specific TNSI methodology. The Life Beyond Trauma Coaching Certificate trains people — who have first completed the 12-week Life Beyond Trauma programme themselves — to support others through it. The Practitioner Certification Pathway is the advanced route for appropriately qualified, licensed or regulated clinicians seeking certification in specialist TNSI methodologies, including the Private Executive Advisory Practitioner Certification.',
        "The Academy exists not simply to teach techniques, but to cultivate thoughtful practitioners who can confidently and responsibly apply the Institute's methodologies within an appropriate professional scope.",
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
          'The Practitioner Certification Pathway is the Academy’s current advanced certification route, available today.',
        href: '/programs/practitioner-certification',
      },
      imageSrc: '/images/programs/nav-academy.webp',
      imageAlt:
        'A bright study room with a wall of bookshelves, a long wooden desk and two chairs facing tall windows onto trees.',
      heroImageSrc: '/images/programs/academy/hero.webp',
      heroImageAlt:
        'A bright study room with a wall of bookshelves, a long wooden desk and two chairs facing tall windows onto trees.',
    },
    {
      id: 'executive-advisory',
      category: 'For Leaders',
      title: 'Private Executive Advisory',
      tagline: 'A structured three-month advisory for senior leaders.',
      paragraphs: [
        'The Private Executive Advisory is a structured three-month advisory programme for founders, CEOs, business owners, and senior executives operating within environments of sustained responsibility, complexity, pressure, and demand.',
        'Underpinned by the Capacity Recalibration Model™, the advisory begins with a comprehensive Executive Capacity Audit and Somatic Load Mapping, synthesised into a personalised Executive Advisory Dossier™, before progressing through five phases: capacity assessment and clarification, stabilisation, load reorganisation, capacity expansion, and consolidation, integration and participation.',
        'Each client receives six individual advisory sessions and weekly monitoring throughout the programme, concluding with a final Executive Advisory Dossier and a 90-Day Continuation Plan.',
      ],
      idealFor: [
        'Founders',
        'CEOs',
        'Business owners',
        'Senior executives under sustained pressure',
      ],
      cta: { label: 'Explore Private Executive Advisory', href: '/programs/executive-advisory' },
      imageSrc: '/images/programs/nav-executive.webp',
      imageAlt:
        'A woman in a tailored blazer stands by a floor-to-ceiling window overlooking a city skyline, beside a stack of books.',
    },
    {
      id: 'organisational-advisory',
      category: 'For Organisations',
      title: 'System-Level Executive Advisory',
      tagline: 'Understanding organisational load, not just individual stress.',
      paragraphs: [
        "The System-Level Executive Advisory extends the Institute's work beyond the individual executive into the wider organisational environment — for leadership teams and organisations wanting to understand how pressure, responsibility, decision-making, workload, communication, and organisational structure are affecting collective capacity and sustainable performance.",
        'The work identifies where organisational demands are creating unnecessary nervous-system load across teams and leadership structures — patterns of chronic urgency, over-responsibility, ineffective delegation, decision bottlenecks, and poor recovery culture — examining systemic patterns rather than individualising stress.',
        'Engagements may include structured assessment of leadership demand, workload distribution, decision pathways, and communication patterns, with outcomes including a clearer understanding of organisational load, stronger distribution of responsibility, and more sustainable approaches to leadership and team performance.',
      ],
      idealFor: [
        'Leadership teams',
        'Organisations addressing systemic pressure',
        'Public sector',
        'Healthcare',
        'Education',
        'Corporate organisations',
      ],
      cta: {
        label: 'Explore System-Level Executive Advisory',
        href: '/programs/organisational-advisory',
      },
      imageSrc: '/images/programs/organisational-advisory/thumb-studio.webp',
      imageAlt:
        'A bright, quiet meeting room with a long wooden table, cream chairs and tall arched windows.',
      heroImageSrc: '/images/programs/organisational-advisory/hero-studio.webp',
      heroImageAlt:
        'A bright, quiet meeting room with a long wooden table, cream chairs and tall arched windows.',
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
