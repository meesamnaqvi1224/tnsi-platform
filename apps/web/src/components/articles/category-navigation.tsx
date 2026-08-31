import NextLink from 'next/link';
import { cn } from '@tnsi/ui';
import type { ArticleCategoryCount } from '@/lib/articles';

export interface CategoryNavigationProps {
  categories: ArticleCategoryCount[];
  activeCategory?: string;
}

function categoryLabelClasses(isActive: boolean) {
  return cn(
    'font-heading text-lg font-semibold tracking-tight',
    isActive ? 'text-foreground underline underline-offset-4' : 'text-foreground',
  );
}

export function CategoryNavigation({ categories, activeCategory }: CategoryNavigationProps) {
  const isAllActive = !activeCategory;

  return (
    <nav aria-label="Article categories">
      <ul className="flex flex-wrap gap-x-(--space-lg) gap-y-(--space-lg) sm:gap-x-(--space-2xl)">
        <li>
          <NextLink
            href="/articles"
            aria-current={isAllActive ? 'page' : undefined}
            className="interaction-opacity interaction-focus group flex flex-col gap-(--space-xs) rounded-sm hover:opacity-80"
          >
            <span className={categoryLabelClasses(isAllActive)}>All Articles</span>
          </NextLink>
        </li>

        {categories.map((category) => {
          const isActive = category.category === activeCategory;
          return (
            <li key={category.category}>
              <NextLink
                href={`/articles?category=${encodeURIComponent(category.category)}`}
                aria-current={isActive ? 'page' : undefined}
                className="interaction-opacity interaction-focus group flex flex-col gap-(--space-xs) rounded-sm hover:opacity-80"
              >
                <span className={categoryLabelClasses(isActive)}>{category.category}</span>
                <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.15em] uppercase">
                  {category.count} {category.count === 1 ? 'article' : 'articles'}
                </span>
              </NextLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
