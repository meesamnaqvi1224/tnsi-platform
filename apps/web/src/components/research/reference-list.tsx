import type { ResearchReference } from '@/content/research';

export interface ReferenceListProps {
  references: readonly ResearchReference[];
}

export function ReferenceList({ references }: ReferenceListProps) {
  return (
    <ol className="flex flex-col" aria-label="Selected references">
      {references.map((ref, index) => (
        <li
          key={`${ref.author}-${ref.year}`}
          className="border-border grid grid-cols-1 gap-(--space-sm) border-t py-(--space-xl) sm:grid-cols-[48px_1fr_auto]"
        >
          <span className="text-muted-foreground font-mono text-sm tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>

          <div className="flex flex-col gap-(--space-xs)">
            <p className="text-foreground text-sm font-medium">
              {ref.author} ({ref.year}).
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed italic">
              {ref.publication}
            </p>
          </div>

          <span className="text-muted-foreground self-start font-mono text-[0.625rem] tracking-[0.15em] uppercase sm:text-right">
            {ref.category}
          </span>
        </li>
      ))}
    </ol>
  );
}
