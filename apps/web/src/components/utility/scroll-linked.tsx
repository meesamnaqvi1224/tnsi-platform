'use client';

import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '@tnsi/ui';

interface ScrollLinkedProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Exposes how far the page has scrolled past this element as a CSS custom
 * property `--p` (0 when the element's top is at the top of the viewport, 1
 * once it has fully scrolled out). Children turn that into very small
 * transforms, e.g. `scale(calc(1 + var(--p) * 0.03))`, so all the visual
 * decisions stay in markup, not here.
 *
 * Deliberately restrained: the scroll listener is attached ONLY while the
 * element is on screen (an `IntersectionObserver` gates it), updates run in
 * a single `requestAnimationFrame` per frame and write one CSS property —
 * no React state, no re-renders. Does nothing at all under
 * `prefers-reduced-motion`, leaving `--p` at 0 so content stays static.
 */
export function ScrollLinked({ children, className, ...rest }: ScrollLinkedProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const { top, height } = node.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -top / Math.max(height, 1)));
      node.style.setProperty('--p', progress.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        window.addEventListener('scroll', onScroll, { passive: true });
        update();
      } else {
        window.removeEventListener('scroll', onScroll);
      }
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={cn(className)} style={{ '--p': 0 } as React.CSSProperties} {...rest}>
      {children}
    </div>
  );
}
