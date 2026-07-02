'use client';

import dynamic from 'next/dynamic';

export const LazyArticleShare = dynamic(
  () =>
    import('@/components/articles/template/article-share').then((module) => ({
      default: module.ArticleShare,
    })),
  { ssr: false, loading: () => <span className="text-muted-foreground text-sm">Share</span> },
);
