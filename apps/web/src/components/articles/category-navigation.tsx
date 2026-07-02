import NextLink from 'next/link';
import type { ArticleCategory } from '@/content/articles';

export interface CategoryNavigationProps {
  categories: readonly ArticleCategory[];
}

export function CategoryNavigation({ categories }: CategoryNavigationProps) {
  return (
    <nav aria-label="Article categories">
      <ul className="flex flex-wrap gap-x-(--space-lg) gap-y-(--space-lg) sm:gap-x-(--space-2xl)">
        {categories.map((category) => (
          <li key={category.id}>
            <NextLink
              href={category.href}
              className="interaction-opacity interaction-focus group flex flex-col gap-(--space-xs) rounded-sm hover:opacity-80"
            >
              <span className="font-heading text-foreground text-lg font-semibold tracking-tight">
                {category.label}
              </span>
              <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
                {category.count} articles
              </span>
            </NextLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
