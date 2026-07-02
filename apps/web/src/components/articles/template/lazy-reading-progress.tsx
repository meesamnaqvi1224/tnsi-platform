'use client';

import dynamic from 'next/dynamic';

export const LazyReadingProgress = dynamic(
  () =>
    import('@/components/articles/template/reading-progress').then((module) => ({
      default: module.ReadingProgress,
    })),
  { ssr: false },
);
