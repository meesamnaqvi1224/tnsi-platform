import type { ArticleBodyBlock } from '@/content/article-posts/types';

export interface TableOfContentsProps {
  blocks: ArticleBodyBlock[];
}

function extractHeadings(blocks: ArticleBodyBlock[]) {
  return blocks.filter(
    (block): block is Extract<ArticleBodyBlock, { type: 'heading' }> =>
      block.type === 'heading' && block.level === 2,
  );
}

export function TableOfContents({ blocks }: TableOfContentsProps) {
  const headings = extractHeadings(blocks);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Table of contents" className="hidden xl:block">
      <div className="sticky top-(--space-3xl)">
        <p className="text-muted-foreground mb-(--space-lg) font-mono text-[0.625rem] tracking-[0.2em] uppercase">
          Contents
        </p>
        <ol className="flex flex-col gap-(--space-sm)">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a href={`#${heading.id}`} className="interaction-text-link text-sm leading-snug">
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
