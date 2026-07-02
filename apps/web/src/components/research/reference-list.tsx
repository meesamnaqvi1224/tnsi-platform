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
          className="border-border grid grid-cols-[48px_minmax(0,1fr)] gap-x-(--space-sm) gap-y-(--space-xs) border-t py-(--space-xl) lg:grid-cols-[48px_minmax(0,1fr)_auto]"
        >
          <span className="text-muted-foreground font-mono text-sm tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>

          <div className="col-start-2 flex min-w-0 flex-col gap-(--space-xs) lg:col-start-2">
            <p className="text-foreground text-sm font-medium break-words">
              {ref.author} ({ref.year}).
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed break-words italic">
              {ref.publication}
            </p>
          </div>

          <span className="text-muted-foreground col-span-2 col-start-2 self-start font-mono text-[0.625rem] tracking-[0.15em] uppercase lg:col-span-1 lg:col-start-3 lg:text-right">
            {ref.category}
          </span>
        </li>
      ))}
    </ol>
  );
}
