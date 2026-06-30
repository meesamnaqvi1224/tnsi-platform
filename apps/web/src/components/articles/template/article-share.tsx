'use client';

import { Link2 } from 'lucide-react';

export function ArticleShare() {
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-(--space-sm) text-sm transition-colors"
      onClick={() => {
        void navigator.clipboard.writeText(window.location.href);
      }}
      aria-label="Copy article link to clipboard"
    >
      <Link2 aria-hidden className="size-4" />
      Share
    </button>
  );
}
