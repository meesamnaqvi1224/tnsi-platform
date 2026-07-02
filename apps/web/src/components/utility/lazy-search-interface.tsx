'use client';

import dynamic from 'next/dynamic';

export const LazySearchInterface = dynamic(
  () =>
    import('@/components/utility/search-interface').then((module) => ({
      default: module.SearchInterface,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="border-border bg-secondary/40 h-14 w-full max-w-3xl animate-pulse rounded-sm"
      />
    ),
  },
);
