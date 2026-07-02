import { Text } from '@tnsi/ui';
import type { ResearchInitiativeItem } from '@/content/research';

export interface ResearchInitiativeProps {
  initiative: ResearchInitiativeItem;
}

export function ResearchInitiative({ initiative }: ResearchInitiativeProps) {
  return (
    <article className="border-border flex flex-col gap-(--space-lg) border-t py-(--space-3xl)">
      <h3 className="font-heading text-foreground text-3xl font-semibold tracking-tight lg:text-4xl">
        {initiative.title}
      </h3>
      <Text tone="muted" className="max-w-prose leading-relaxed">
        {initiative.description}
      </Text>
      <dl className="flex flex-col gap-(--space-sm)">
        <div className="flex flex-col gap-(--space-2xs)">
          <dt className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
            Status
          </dt>
          <dd className="text-foreground text-sm">{initiative.status}</dd>
        </div>
        <div className="flex flex-col gap-(--space-2xs)">
          <dt className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
            Future Publication
          </dt>
          <dd className="text-muted-foreground text-sm italic">{initiative.futurePublication}</dd>
        </div>
      </dl>
    </article>
  );
}
