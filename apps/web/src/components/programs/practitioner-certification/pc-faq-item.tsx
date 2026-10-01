'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@tnsi/ui';

export function PcFaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-foreground/15 border-t">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="interaction-focus flex w-full cursor-pointer items-center justify-between gap-(--space-lg) py-(--space-xl) text-left"
      >
        <span className="font-heading text-foreground text-base font-semibold tracking-tight sm:text-lg">
          {question}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'text-muted-foreground duration-slow ease-standard size-4 shrink-0 transition-transform',
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
          <p className="text-muted-foreground max-w-2xl pb-(--space-xl) text-sm leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
