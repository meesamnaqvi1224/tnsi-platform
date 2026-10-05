'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@tnsi/ui';

interface Condition {
  title: string;
  description: string;
}

interface DevelopmentalConditionsProps {
  items: readonly Condition[];
}

/**
 * The five conditions as a scroll-driven progression. Each condition is a
 * tall row; whichever row crosses the middle band of the viewport becomes
 * the active one (a single `IntersectionObserver` with a thin centre band —
 * no scroll listener, no continuous work). The active row is darker, its
 * title slightly larger, and its divider draws across; the others stay fully
 * legible, just quieter. State changes use only the page's existing motion
 * vocabulary: colour/opacity, a small scale, a thin line.
 *
 * The same component serves mobile (rows are simply shorter and there is no
 * sticky column beside it). Every condition's full text is always in the
 * DOM and readable, with or without JS.
 */
export function DevelopmentalConditions({ items }: DevelopmentalConditionsProps) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const nodes = refs.current.filter((node): node is HTMLLIElement => node !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = nodes.indexOf(entry.target as HTMLLIElement);
            if (index !== -1) setActive(index);
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <ul className="list-none">
      {items.map((item, index) => {
        const isActive = index === active;
        return (
          <li
            key={item.title}
            ref={(node) => {
              refs.current[index] = node;
            }}
            aria-current={isActive ? 'true' : undefined}
            className="relative flex min-h-[34vh] flex-col justify-center py-(--space-xl) lg:min-h-[52vh]"
          >
            {/* Static rule + the active rule that draws across it. */}
            <div className="bg-border absolute inset-x-0 top-0 h-px" aria-hidden />
            <div
              aria-hidden
              className={cn(
                'bg-foreground absolute inset-x-0 top-0 h-px origin-left transition-transform duration-[900ms] ease-out',
                isActive ? 'scale-x-100' : 'scale-x-0',
              )}
            />

            <h3
              className={cn(
                'font-heading origin-left text-[clamp(2rem,3.6vw,3.25rem)] leading-[1.08] tracking-tight transition-[transform,color] duration-500 ease-out',
                isActive
                  ? 'text-foreground translate-x-0 scale-[1.04] font-semibold'
                  : 'text-foreground/60 -translate-x-0.5 scale-100 font-medium',
              )}
            >
              {item.title}
            </h3>
            <p
              className={cn(
                'mt-(--space-md) max-w-[46ch] text-[1.0625rem] leading-[1.75] transition-colors duration-500 ease-out sm:text-lg',
                isActive ? 'text-foreground' : 'text-foreground/70',
              )}
            >
              {item.description}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
