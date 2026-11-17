/**
 * Human Expansion Theory™ copy shown in the app. Source: Caroline Reed's approved text, as it appears
 * on the website (apps/web/src/content/human-expansion-theory.ts). Used verbatim - do not paraphrase
 * or add definitions here. When the website copy changes, change it here too (the app cannot import
 * from apps/web); the longer-term home for this text is the CMS.
 *
 * The five conditions below have one approved sentence each. The fuller Understand / Recognise /
 * Explore / Practise / Reflect material for each condition has not been supplied yet, so it is not
 * in this file and nothing in the app invents it.
 */

export const CONDITION_NAMES = [
  'Safety',
  'Capacity',
  'Availability',
  'Expansion',
  'Participation',
] as const;

export type ConditionName = (typeof CONDITION_NAMES)[number];

export const humanExpansionTheory = {
  title: 'Human Expansion Theory™',
  tagline: 'A participation-centred framework for understanding human development.',
  intro: [
    'The Human Expansion Theory™ is the intellectual foundation of The Nervous System Institute. It proposes that the purpose of human development is to participate more fully in life rather than to simply survive, regulate, recover, or perform.',
    'Drawing together insights from neuroscience, psychology, attachment theory, developmental science, physiology, and trauma research, the theory offers an integrated framework for understanding how people grow throughout the lifespan and the conditions that enable meaningful participation.',
  ],
  centralProposition: {
    heading: 'The Central Proposition',
    statement:
      'Human Expansion Theory™ proposes that participation is the central expression of human development.',
    paragraphs: [
      'Human beings do not develop simply to function, recover, or regulate. They develop so they can increasingly engage with the opportunities, relationships, responsibilities, creativity, and purpose that life offers.',
      'From this perspective, regulation is not the destination. It is one of the developmental conditions that makes meaningful participation possible.',
    ],
  },
  conditions: {
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
    ] as { title: ConditionName; description: string }[],
  },
} as const;

export function conditionDescription(name: ConditionName): string {
  return (
    humanExpansionTheory.conditions.items.find((item) => item.title === name)?.description ?? ''
  );
}
