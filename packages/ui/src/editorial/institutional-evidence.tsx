import { cn } from '../lib/cn';

export interface EvidenceItem {
  /**
   * Short category label — e.g. "Clinical Practice", "Research Foundation".
   * Rendered small and muted above the statement.
   */
  label: string;
  /**
   * The credential statement itself. Write qualitatively, not quantitatively:
   * "Fifteen years in private practice" not "500+ clients served".
   * One to three sentences. No bullet points, no lists within the statement.
   */
  statement: string;
}

export interface InstitutionalEvidenceProps {
  items: readonly EvidenceItem[];
  className?: string;
}

/**
 * Institutional evidence panel — presents credibility through typography,
 * spacing, and hairline rules. No icons. No counters. No animation.
 *
 * Designed to feel like the faculty credentials block in an academic
 * journal or the author credentials section in an HBR feature — authoritative
 * through understatement, not through emphasis. Two horizontal rules create
 * the panel; everything inside is text.
 *
 * The component handles its own internal layout (label + statement grid).
 * The caller provides the surrounding `Container` and `Section` spacing.
 *
 * Evidence content rules:
 * - Qualitative statements only — no statistics, percentages, or "counter" values.
 * - Labels are categories, not headings — they orient, not declare.
 * - Statements should read as sentences from a long-form article, not bullet points.
 * - 3–5 items is the intended range; fewer feels sparse, more creates density.
 *
 * Usage:
 * ```tsx
 * <InstitutionalEvidence
 *   items={[
 *     {
 *       label: 'Clinical Practice',
 *       statement:
 *         'Fifteen years in private practice working with high-achieving women and senior executives across Europe and North America.',
 *     },
 *     {
 *       label: 'Post-Graduate Training',
 *       statement:
 *         'Advanced certification in polyvagal theory, attachment-informed therapy, and somatic approaches to nervous system regulation.',
 *     },
 *     {
 *       label: 'Research Foundation',
 *       statement:
 *         'Methodology grounded in peer-reviewed neuroscience and fifteen years of clinical observation, not therapeutic trend.',
 *     },
 *   ]}
 * />
 * ```
 */
export function InstitutionalEvidence({ items, className }: InstitutionalEvidenceProps) {
  return (
    <div className={cn('border-y border-border py-(--space-2xl)', className)}>
      <div className="grid grid-cols-1 gap-(--space-2xl) sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-(--space-xs)">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {item.label}
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.statement}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
