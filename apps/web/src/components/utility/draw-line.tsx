'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@tnsi/ui';

/**
 * A hairline rule that draws itself left-to-right once, when it enters the
 * viewport — the "thin divider movement" of the motion system. Purely
 * visual (`aria-hidden`); a plain static rule if JS never runs.
 */
export function DrawLine({ className, delayMs = 0 }: { className?: string; delayMs?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        'bg-foreground/30 h-px origin-left transition-transform duration-[1200ms] ease-out',
        visible ? 'scale-x-100' : 'scale-x-0',
        className,
      )}
    />
  );
}
