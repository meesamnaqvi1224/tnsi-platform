import { Text } from '@tnsi/ui';

export interface TimelineEvent {
  era: string;
  title: string;
  description: string;
}

export interface TimelineProps {
  events: readonly TimelineEvent[];
  intro?: string;
}

export function Timeline({ events, intro }: TimelineProps) {
  return (
    <div>
      {intro && (
        <Text tone="muted" className="mb-(--space-3xl) max-w-2xl leading-relaxed">
          {intro}
        </Text>
      )}

      {/* Horizontal timeline — desktop */}
      <ol
        className="hidden gap-(--space-md) xl:grid"
        style={{ gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))` }}
        aria-label="Evidence timeline"
      >
        {events.map((event, index) => (
          <li key={event.era} className="flex flex-col">
            <div className="border-border flex flex-col gap-(--space-md) border-t pt-(--space-xl)">
              <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
                {event.era}
              </span>
              <p className="font-heading text-foreground text-lg leading-snug font-semibold tracking-tight">
                {event.title}
              </p>
              <Text size="sm" tone="muted" className="leading-relaxed">
                {event.description}
              </Text>
            </div>
            {index < events.length - 1 && (
              <span aria-hidden className="text-muted-foreground mt-(--space-lg) font-mono text-sm">
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* Vertical timeline — mobile/tablet */}
      <ol className="flex flex-col xl:hidden" aria-label="Evidence timeline">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          return (
            <li key={event.era} className="flex flex-col items-start">
              <div className="border-border w-full border-t py-(--space-xl)">
                <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
                  {event.era}
                </span>
                <p className="font-heading text-foreground mt-(--space-sm) text-xl font-semibold tracking-tight">
                  {event.title}
                </p>
                <Text size="sm" tone="muted" className="mt-(--space-sm) leading-relaxed">
                  {event.description}
                </Text>
              </div>
              {!isLast && (
                <span
                  aria-hidden
                  className="text-muted-foreground py-(--space-sm) font-mono text-lg"
                >
                  ↓
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
