'use client';

import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@tnsi/ui';

interface ImageRevealProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The page's single image-motion pattern: a photograph that settles from a
 * very slight enlargement (1.06) to its natural size as it enters the
 * viewport, over ~1.8s. One `IntersectionObserver`, fires once. Wraps a
 * `fill` image, so it must be placed inside a positioned, overflow-hidden
 * parent. `prefers-reduced-motion` is neutralised globally in `globals.css`.
 */
export function ImageReveal({ children, className }: ImageRevealProps) {
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
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'absolute inset-0 transition-transform duration-[1800ms] ease-out',
        visible ? 'scale-100' : 'scale-[1.06]',
        className,
      )}
    >
      {children}
    </div>
  );
}
