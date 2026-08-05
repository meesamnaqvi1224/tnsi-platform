import { cn } from '../lib/cn';

export const CAPACITY_STAGES = ['Survival', 'Understand', 'Regulate', 'Rewire', 'Lead'] as const;

export type CapacityStage = (typeof CAPACITY_STAGES)[number];

export interface CapacityJourneyProps {
  /**
   * Highlights one stage as the current position in the journey.
   * When omitted, all stages render at equal visual weight — use this
   * when introducing the concept (a map), not tracking progress (a tracker).
   */
  current?: CapacityStage;
  className?: string;
}

/**
 * The Capacity Journey — TNSI's signature orientation element.
 *
 * Five stages over a continuous 1px hairline: Survival → Understand →
 * Regulate → Rewire → Lead. Two modes:
 *
 * - **Passive** (no `current`): the full arc at equal weight — a map, not
 *   a metric. Use when first introducing the journey concept.
 * - **Active** (`current` set): one stage emphasised, the rest recede.
 *   Use when a piece of content or a program is associated with a specific
 *   stage in the journey.
 *
 * Design intent: closer to a scientific measuring instrument or a typeset
 * timeline than any UI progress bar. No fill, no animation, no accent
 * colour — only line weight and typographic contrast carry the meaning.
 *
 * Usage:
 * ```tsx
 * <CapacityJourney />                      // passive — full arc
 * <CapacityJourney current="Understand" /> // active — entry stage
 * <CapacityJourney current="Rewire" />     // active — later stage
 * ```
 *
 * Accessibility: stages are rendered as a `role="list"` so screen readers
 * enumerate them naturally. No ARIA progress role — this is editorial
 * orientation, not a UI control.
 */
export function CapacityJourney({ current, className }: CapacityJourneyProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Full-width hairline — sits behind all tick marks */}
      <div
        className="absolute top-[4px] right-0 left-0 border-t border-foreground/30"
        aria-hidden
      />

      <div
        className="flex justify-between"
        role="list"
        aria-label={`The Capacity Journey${current ? ` — current stage: ${current}` : ''}`}
      >
        {CAPACITY_STAGES.map((stage) => {
          const isCurrent = stage === current;
          return (
            <div
              key={stage}
              role="listitem"
              className="flex flex-col items-center gap-(--space-sm)"
            >
              {/* Tick mark — foreground when current, muted-but-visible otherwise */}
              <div
                className={cn(
                  'w-px',
                  isCurrent ? 'bg-foreground h-[10px]' : 'bg-foreground/40 h-[9px]',
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'text-xs tracking-wide sm:text-sm',
                  isCurrent ? 'text-foreground font-medium' : 'text-foreground/70',
                )}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
