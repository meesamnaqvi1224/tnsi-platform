import type * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Container, Section } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';

interface IdealForBandProps {
  /** Id for the heading; the section is labelled by it. */
  headingId: string;
  items: readonly string[];
  /** Purely visual: one line icon per existing audience label, keyed by the label. */
  icons: Record<string, LucideIcon>;
  /** Desktop columns — 3 suits six items, 2 suits four. */
  columns?: 2 | 3;
}

const columnClasses = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
} as const;

/**
 * The "Ideal for" highlight shared by the pathway pages: a dark slate band so
 * the audience reads as a moment of its own, with each existing label set in
 * a tile beside a line icon. The gold is derived from the brand's bronze
 * accent token, warmed with the sand tone for contrast on slate, rather than
 * introducing a new colour.
 */
export function IdealForBand({ headingId, items, icons, columns = 3 }: IdealForBandProps) {
  return (
    <Section
      className="dark bg-background text-foreground border-foreground/15 border-t py-(--space-3xl) sm:py-(--space-4xl)"
      style={
        {
          '--ideal-gold': 'color-mix(in oklch, var(--accent-bronze) 50%, var(--warm-sand))',
        } as React.CSSProperties
      }
      aria-labelledby={headingId}
    >
      <Container size="xl">
        <FadeIn>
          <div className="mb-(--space-2xl) flex items-end gap-(--space-xl)">
            <div>
              <div className="mb-(--space-md) h-px w-7 bg-(--ideal-gold)" aria-hidden />
              <h2
                id={headingId}
                className="font-heading text-foreground text-4xl leading-none font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem]"
              >
                Ideal for
              </h2>
            </div>
            <div className="bg-foreground/20 mb-2 hidden h-px flex-1 sm:block" aria-hidden />
          </div>
        </FadeIn>

        <ul
          className={`grid grid-cols-1 gap-(--space-md) ${columnClasses[columns]}`}
          aria-label="Ideal for"
        >
          {items.map((item, index) => {
            const Icon = icons[item];
            return (
              <li key={item}>
                <FadeIn delayMs={index * 80} className="h-full">
                  <div className="group border-foreground/15 bg-foreground/5 hover:border-foreground/30 duration-base ease-standard flex h-full min-h-40 flex-col justify-between gap-(--space-xl) rounded-sm border p-(--space-lg) transition-[border-color,transform] hover:-translate-y-1">
                    {Icon ? (
                      <span
                        aria-hidden
                        className="duration-base ease-standard flex size-11 items-center justify-center rounded-sm border border-(--ideal-gold)/60 text-(--ideal-gold) transition-colors group-hover:border-(--ideal-gold)"
                      >
                        <Icon className="size-6" strokeWidth={1.25} />
                      </span>
                    ) : null}
                    <p className="font-heading text-foreground text-xl leading-snug font-medium tracking-tight sm:text-[1.375rem]">
                      {item}
                    </p>
                  </div>
                </FadeIn>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
