import type * as React from 'react';
import { cn } from '../lib/cn';
import { Container } from '../primitives/container';

export interface TypographicMomentProps {
  children: React.ReactNode;
  /**
   * `'light'` — warm ivory background, normal foreground. Default.
   * `'dark'`  — Deep Slate background, cream foreground. Use for the
   *              most essential, distilled statements — the dark surround
   *              transforms the register from directional to contemplative.
   */
  variant?: 'light' | 'dark';
  /**
   * `'left'`   — left-aligned, directional. The sentence addresses the
   *               reader personally. Default.
   * `'center'` — centered, declarative. Use with the dark variant for
   *               statements that belong to the space, not to the reader.
   */
  align?: 'left' | 'center';
  className?: string;
}

/**
 * Full-screen typographic moment — one sentence; one viewport.
 *
 * The drama is not in the type size. It is in the ratio of text to
 * silence: `min-h-[85vh]` of space given to a single thought. The reader
 * is asked to stop. Not to scan. To read one sentence slowly.
 *
 * Rules the caller must follow:
 * - One complete thought only. If two sentences are needed, reconsider.
 * - No pull-quote marks — scale is the emphasis, not punctuation.
 * - No decorative graphics alongside this component.
 * - Use sparingly: one per major page section. Back-to-back instances
 *   eliminate the pause this component depends on.
 * - Vary `variant` when using more than once per page to prevent monotony.
 *
 * Usage:
 * ```tsx
 * <TypographicMoment>
 *   The nervous system doesn't ask for much. It asks to be heard.
 * </TypographicMoment>
 *
 * <TypographicMoment variant="dark" align="center">
 *   You don't need to think your way out of a physiological state.
 * </TypographicMoment>
 * ```
 */
export function TypographicMoment({
  children,
  variant = 'light',
  align = 'left',
  className,
}: TypographicMomentProps) {
  return (
    <section
      className={cn(
        'flex min-h-[85vh] flex-col justify-center',
        'px-(--space-xl) py-(--space-4xl) sm:px-(--space-3xl)',
        variant === 'dark' && 'dark bg-background text-foreground',
        className,
      )}
    >
      <Container size="xl">
        <p
          className={cn(
            'font-heading font-semibold leading-[1.1] tracking-tight text-foreground',
            'text-4xl lg:text-5xl xl:text-[3.5rem]',
            align === 'left' ? 'max-w-4xl' : 'mx-auto max-w-3xl text-center',
          )}
        >
          {children}
        </p>
      </Container>
    </section>
  );
}
