'use client';

import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@tnsi/ui';

interface FadeInProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  /** Optional stagger, in milliseconds — use sparingly, for small groups of siblings only. */
  delayMs?: number;
  as?: 'div' | 'section';
}

/**
 * Editorial scroll reveal — a quiet 20px fade-up triggered once, on entry
 * into the viewport. No dependency: a single `IntersectionObserver`.
 * `prefers-reduced-motion` is already neutralised globally in `globals.css`
 * (transition-duration: 0.01ms), so this component doesn't special-case it.
 */
export function FadeIn({
  children,
  className,
  delayMs = 0,
  as: Tag = 'div',
  ...rest
}: FadeInProps) {
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
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
