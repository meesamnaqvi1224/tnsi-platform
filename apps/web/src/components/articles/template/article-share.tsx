'use client';

import * as React from 'react';
import { Link2 } from 'lucide-react';

export function ArticleShare() {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="interaction-text-link inline-flex items-center gap-(--space-sm) text-sm"
        onClick={() => {
          void navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          });
        }}
        aria-label="Copy article link to clipboard"
      >
        <Link2 aria-hidden className="size-4" />
        Share
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Article link copied to clipboard.' : ''}
      </span>
    </div>
  );
}
