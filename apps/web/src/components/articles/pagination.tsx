import NextLink from 'next/link';
import { cn } from '@tnsi/ui';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseHref: string;
  className?: string;
}

function pageHref(baseHref: string, page: number) {
  return page === 1 ? baseHref : `${baseHref}?page=${page}`;
}

export function Pagination({ currentPage, totalPages, baseHref, className }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Article pagination" className={cn('flex justify-center', className)}>
      <ul className="flex items-center gap-(--space-sm)">
        <li>
          <NextLink
            href={pageHref(baseHref, Math.max(1, currentPage - 1))}
            aria-disabled={currentPage === 1}
            className={cn(
              'text-muted-foreground hover:text-foreground border-border interaction-colors interaction-focus inline-flex h-10 items-center border px-(--space-md) text-sm font-medium',
              currentPage === 1 && 'pointer-events-none opacity-40',
            )}
          >
            Previous
          </NextLink>
        </li>

        {pages.map((page) => (
          <li key={page}>
            <NextLink
              href={pageHref(baseHref, page)}
              aria-current={page === currentPage ? 'page' : undefined}
              className={cn(
                'border-border interaction-colors interaction-focus inline-flex size-10 items-center justify-center border text-sm font-medium',
                page === currentPage
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {page}
            </NextLink>
          </li>
        ))}

        <li>
          <NextLink
            href={pageHref(baseHref, Math.min(totalPages, currentPage + 1))}
            aria-disabled={currentPage === totalPages}
            className={cn(
              'text-muted-foreground hover:text-foreground border-border interaction-colors interaction-focus inline-flex h-10 items-center border px-(--space-md) text-sm font-medium',
              currentPage === totalPages && 'pointer-events-none opacity-40',
            )}
          >
            Next
          </NextLink>
        </li>
      </ul>
    </nav>
  );
}
