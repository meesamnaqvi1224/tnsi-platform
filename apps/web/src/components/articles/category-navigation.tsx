import NextLink from 'next/link';
import { cn } from '@tnsi/ui';
import { categorySlug, matchesCategory } from '@/lib/article-layout';
import type { ArticleCategoryCount } from '@/lib/articles';

export interface CategoryNavigationProps {
  categories: ArticleCategoryCount[];
  activeCategory?: string;
}

const linkClasses = (isActive: boolean) =>
  cn(
    'interaction-focus interaction-colors -mb-px inline-flex min-h-11 items-center gap-(--space-sm) rounded-none! border-b-2 py-(--space-xs)',
    isActive
      ? 'border-foreground text-foreground'
      : 'text-muted-foreground hover:text-foreground hover:border-border border-transparent',
  );

/**
 * Text-led category filter. It wraps rather than scrolls, so every category is
 * visible on a phone without hunting for an off-screen one, and the active
 * choice is shown by weight, colour and an underline - not by colour alone.
 * Links go to the same `?category=` URLs as before and land on the list.
 */
export function CategoryNavigation({ categories, activeCategory }: CategoryNavigationProps) {
  const isAllActive = !activeCategory;

  return (
    <nav aria-label="Article categories">
      <ul className="border-border flex flex-wrap gap-x-(--space-lg) border-b sm:gap-x-(--space-2xl)">
        <li>
          <NextLink
            href="/articles#latest"
            aria-current={isAllActive ? 'page' : undefined}
            className={linkClasses(isAllActive)}
          >
            <span
              className={cn(
                'font-heading text-base tracking-tight sm:text-lg',
                isAllActive ? 'font-semibold' : 'font-medium',
              )}
            >
              All Insights
            </span>
          </NextLink>
        </li>

        {categories.map((category) => {
          const isActive =
            activeCategory !== undefined && matchesCategory(category, activeCategory);
          return (
            <li key={category.category}>
              <NextLink
                href={`/articles?category=${categorySlug(category.category)}#latest`}
                aria-current={isActive ? 'page' : undefined}
                className={linkClasses(isActive)}
              >
                <span
                  className={cn(
                    'font-heading text-base tracking-tight sm:text-lg',
                    isActive ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {category.category}
                </span>
                <span className="font-mono text-[0.625rem] tracking-[0.1em] tabular-nums">
                  {category.count}
                  <span className="sr-only"> {category.count === 1 ? 'article' : 'articles'}</span>
                </span>
              </NextLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
