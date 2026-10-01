'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, Container } from '@tnsi/ui';

const sections = [
  { id: 'ea-approach', label: 'The Approach' },
  { id: 'ea-advisory', label: 'The Advisory' },
  { id: 'ea-phases', label: 'The Five Phases' },
  { id: 'ea-outcomes', label: 'Outcomes' },
  { id: 'ea-faq', label: 'FAQ' },
] as const;

/**
 * The dark metadata strip beneath the hero, repurposed as a quiet in-page
 * index rather than a repeat of information already in the hero. Sticky
 * beneath the site header; a sentinel above it (observed, not scrolled)
 * toggles a slightly stronger shadow once the bar is actually pinned, so it
 * reads as "lifted" rather than just permanently floating.
 */
export function EaAnchorNav() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => setIsStuck(!entry?.isIntersecting), {
      threshold: 1,
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <nav
        aria-label="Section"
        className={cn(
          'bg-foreground text-background border-border duration-slow ease-standard sticky top-16 z-(--z-sticky) border-t transition-shadow sm:top-20',
          isStuck && 'shadow-lg shadow-black/10',
        )}
      >
        <Container size="xl" className="px-(--space-xl) sm:px-(--space-2xl)">
          <ul className="flex items-center gap-(--space-2xl) overflow-x-auto py-(--space-md)">
            {sections.map((section) => (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  className="interaction-colors text-background/60 hover:text-background font-mono text-[0.625rem] tracking-[0.2em] whitespace-nowrap uppercase"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </nav>
    </>
  );
}
