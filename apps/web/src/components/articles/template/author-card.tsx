import NextLink from 'next/link';
import { buttonVariants, Text } from '@tnsi/ui';
import type { ArticleAuthor } from '@/content/article-posts/types';

export interface AuthorCardProps {
  author: ArticleAuthor;
}

export function AuthorCard({ author }: AuthorCardProps) {
  return (
    <section aria-label="About the author" className="border-border border-t">
      <div className="mx-auto grid max-w-[760px] grid-cols-1 gap-(--space-xl) px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl) lg:grid-cols-[120px_1fr]">
        <div className="bg-secondary relative aspect-square w-[120px] shrink-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <Text size="xs" tone="muted" className="text-center">
              Portrait
            </Text>
          </div>
          <span className="sr-only">{author.imageAlt}</span>
        </div>

        <div className="flex flex-col gap-(--space-md)">
          <div>
            <h2 className="font-heading text-foreground text-2xl font-semibold tracking-tight">
              {author.name}
            </h2>
            <p className="text-muted-foreground mt-(--space-xs) text-sm">{author.role}</p>
          </div>
          <Text tone="muted" className="leading-relaxed">
            {author.biography}
          </Text>
          <NextLink
            href={author.href}
            className={buttonVariants({ variant: 'outline', size: 'md' })}
          >
            About Caroline
          </NextLink>
        </div>
      </div>
    </section>
  );
}
