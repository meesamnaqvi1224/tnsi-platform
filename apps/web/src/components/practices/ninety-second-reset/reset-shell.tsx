import type * as React from 'react';
import { cn } from '@tnsi/ui';
import { RESET_COPY } from './content';
import styles from './reset.module.css';

/**
 * The frame shared by all three screens: a full-viewport, calm surface that sits
 * over the dashboard's sidebar and topbar, so nothing competes with the practice.
 * Scrolls on its own if a small phone needs it.
 */
export function ResetShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(styles.root, 'fixed inset-0 z-50 overflow-y-auto')}>
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 pt-5 pb-8 sm:px-8 sm:pt-7 lg:px-12">
        {children}
      </div>
    </div>
  );
}

/** The Institute's wordmark, set the way the dashboard sidebar sets it. */
export function ResetBrand() {
  return (
    <p className="font-heading text-xs font-medium tracking-[0.24em] text-(--rs-ink) uppercase">
      {RESET_COPY.brand}
    </p>
  );
}
