'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@tnsi/ui';

/**
 * A plain `<details>` can't animate its own open/close height, and this
 * section wants exactly that (the brief is explicit: "smooth height/opacity
 * animation"). The CSS grid-rows trick (`0fr` -> `1fr`) gives a genuine
 * height transition with pure CSS - no measuring, no JS beyond the open
 * boolean itself.
 */
export function EaFaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-foreground/15 border-t">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="interaction-focus flex w-full cursor-pointer items-center justify-between gap-(--space-lg) py-(--space-lg) text-left"
      >
        <span className="font-heading text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          {question}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'text-muted-foreground duration-slow ease-standard size-5 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'duration-slow ease-standard grid transition-[grid-template-rows]',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div
          className={cn(
            'duration-slow ease-standard overflow-hidden transition-opacity',
            open ? 'opacity-100' : 'opacity-0',
          )}
        >
          <p className="text-muted-foreground max-w-2xl pb-(--space-xl) leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
