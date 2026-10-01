'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, Text } from '@tnsi/ui';

interface Step {
  title: string;
  description: string;
}

/**
 * The desktop rail: a sticky 01—02—03—04—05 line whose active node tracks
 * whichever phase is currently in view below it. One IntersectionObserver
 * shared across all five phase blocks (not five separate ones) — each
 * block's visibility toggles a bit in a small array, and the active index
 * is just "the lowest visible index still on screen", which reads correctly
 * whether the user is scrolling down or back up.
 *
 * Mobile skips the rail entirely and renders a plain connected vertical
 * list — no JS, no active-state, exactly the "don't just shrink the
 * desktop design" brief for small screens.
 */
export function EaJourneyPhases({ steps }: { steps: readonly Step[] }) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const visible = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.phaseIndex);
          if (entry.isIntersecting) {
            visible.add(index);
          } else {
            visible.delete(index);
          }
        }
        if (visible.size > 0) {
          setActiveIndex(Math.min(...visible));
        }
      },
      { rootMargin: '-35% 0px -35% 0px', threshold: 0 },
    );

    for (const node of refs.current) {
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      {/* Desktop rail */}
      <div className="sticky top-36 z-10 mb-(--space-4xl) hidden lg:block">
        <div className="relative flex items-center justify-between">
          <div
            className="bg-background/20 absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
            aria-hidden
          />
          {steps.map((step, index) => (
            <div key={step.title} className="relative flex flex-col items-center gap-(--space-sm)">
              <span
                className={cn(
                  'bg-background duration-slow ease-standard flex size-10 items-center justify-center rounded-full font-mono text-xs tabular-nums transition-all',
                  index === activeIndex
                    ? 'text-foreground scale-110'
                    : 'text-background/40 bg-background/10 scale-100',
                )}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span
                className={cn(
                  'duration-slow ease-standard absolute top-full mt-(--space-sm) w-40 text-center font-mono text-[0.625rem] tracking-[0.1em] uppercase transition-opacity',
                  index === activeIndex ? 'text-background/70 opacity-100' : 'opacity-0',
                )}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Phase content — the thing the rail above is actually tracking */}
      <ol className="flex flex-col lg:gap-(--space-4xl)">
        {steps.map((step, index) => (
          <li
            key={step.title}
            ref={(node) => {
              refs.current[index] = node;
            }}
            data-phase-index={index}
            className="border-background/15 flex flex-col gap-(--space-sm) border-t py-(--space-xl) first:border-t-0 lg:min-h-[40vh] lg:justify-center lg:border-none lg:py-0 lg:first:border-t-0"
          >
            <div className="flex items-baseline gap-(--space-md) lg:hidden">
              <span className="text-background/40 font-mono text-xs tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="bg-background/15 h-px flex-1" aria-hidden />
            </div>

            <p
              className={cn(
                'font-heading duration-slow ease-standard text-2xl font-semibold tracking-tight transition-opacity sm:text-3xl lg:text-4xl xl:text-[2.75rem]',
                index === activeIndex ? 'lg:opacity-100' : 'lg:opacity-30',
              )}
            >
              {step.title}
            </p>
            <Text
              className={cn(
                'text-background/60 duration-slow ease-standard max-w-lg leading-relaxed transition-opacity lg:text-lg',
                index === activeIndex ? 'lg:opacity-100' : 'lg:opacity-0',
              )}
            >
              {step.description}
            </Text>
          </li>
        ))}
      </ol>
    </div>
  );
}
