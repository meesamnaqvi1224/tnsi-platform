import NextLink from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Container, Stack, Text } from '@tnsi/ui';
import { ArticleShare } from '@/components/articles/template/article-share';
import type { ArticlePost } from '@/content/article-posts/types';

export interface ArticleHeroProps {
  hero: ArticlePost['hero'];
}

export function ArticleHero({ hero }: ArticleHeroProps) {
  return (
    <header className="border-border border-b">
      <Container size="xl" className="px-(--space-xl) pt-(--space-xl) sm:px-(--space-2xl)">
        <NextLink
          href="/articles"
          className="text-muted-foreground hover:text-foreground mb-(--space-xl) inline-flex items-center gap-(--space-sm) text-sm font-medium transition-colors"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to Articles
        </NextLink>
      </Container>

      <div className="bg-secondary relative aspect-video max-h-[70vh] w-full">
        <div className="absolute inset-0 flex items-center justify-center">
          <Text size="sm" tone="muted" className="max-w-[14rem] text-center">
            Editorial hero photography placeholder
          </Text>
        </div>
        <span className="sr-only">{hero.imageAlt}</span>
      </div>

      <Container size="xl" className="px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl)">
        <Stack gap="xl" className="mx-auto max-w-[760px]">
          <div className="flex flex-wrap items-center gap-x-(--space-lg) gap-y-(--space-xs)">
            <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
              {hero.category}
            </span>
            <span className="text-muted-foreground text-xs">
              {hero.publishedAt} · {hero.readingTime}
            </span>
          </div>

          <h1 className="font-heading text-foreground text-4xl leading-[1.08] font-semibold tracking-tight lg:text-5xl">
            {hero.headline}
          </h1>

          <p className="text-foreground text-xl leading-relaxed font-medium">{hero.subtitle}</p>

          <div className="border-border flex flex-wrap items-center justify-between gap-(--space-lg) border-t pt-(--space-lg)">
            <div className="flex flex-col gap-(--space-2xs)">
              <span className="text-foreground text-sm font-medium">{hero.author.name}</span>
              <span className="text-muted-foreground text-xs">{hero.author.role}</span>
            </div>

            <ArticleShare />
          </div>
        </Stack>
      </Container>
    </header>
  );
}
