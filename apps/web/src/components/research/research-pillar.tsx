import { Text } from '@tnsi/ui';
import type { ResearchPillarItem } from '@/content/research';

export interface ResearchPillarProps {
  pillar: ResearchPillarItem;
  index: number;
}

export function ResearchPillar({ pillar, index }: ResearchPillarProps) {
  return (
    <article className="border-border flex flex-col gap-(--space-lg) border-t py-(--space-3xl)">
      <span className="text-muted-foreground font-mono text-sm tabular-nums">
        {String(index + 1).padStart(2, '0')}
      </span>
      <h3 className="font-heading text-foreground text-3xl font-semibold tracking-tight lg:text-4xl">
        {pillar.title}
      </h3>
      <Text tone="muted" className="max-w-prose leading-relaxed">
        {pillar.description}
      </Text>
      <span className="text-muted-foreground font-mono text-[0.625rem] tracking-widest uppercase">
        {pillar.statistic}
      </span>
    </article>
  );
}
