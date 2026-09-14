const TIERS = [
  {
    index: '01',
    bg: 'bg-card',
    name: 'Ventral Vagal',
    state: 'Social Engagement',
    description:
      'The nervous system’s most regulated state. Safety and connection are available, making curiosity, collaboration, and participation possible.',
  },
  {
    index: '02',
    bg: 'bg-secondary',
    name: 'Sympathetic',
    state: 'Mobilisation',
    description:
      'Energy mobilises to meet perceived challenge or threat — fight or flight. An adaptive capacity the method works with, not against.',
  },
  {
    index: '03',
    bg: 'bg-accent',
    name: 'Dorsal Vagal',
    state: 'Immobilisation',
    description:
      'The system’s most protective state — shutdown, numbness, or collapse when other responses are unavailable. Also adaptive, not a malfunction.',
  },
] as const;

/**
 * Original diagram of Porges' three-level autonomic hierarchy (see
 * polyvagalFigure.source in human-expansion-theory content). Built from the
 * approved caption text rather than any third-party illustration.
 */
export function PolyvagalHierarchyFigure() {
  return (
    <div>
      {TIERS.map((tier) => (
        <div
          key={tier.index}
          className={`${tier.bg} border-border flex flex-col gap-(--space-sm) border-t p-(--space-lg) first:border-t-0 sm:flex-row sm:items-baseline sm:gap-(--space-2xl) sm:p-(--space-xl)`}
        >
          <div className="flex items-baseline gap-(--space-sm) sm:w-64 sm:shrink-0">
            <span className="text-muted-foreground font-mono text-xs">{tier.index}</span>
            <div>
              <p className="font-heading text-foreground text-lg font-semibold tracking-tight">
                {tier.name}
              </p>
              <p className="text-muted-foreground text-xs tracking-[0.1em] uppercase">
                {tier.state}
              </p>
            </div>
          </div>

          <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
            {tier.description}
          </p>
        </div>
      ))}
    </div>
  );
}
