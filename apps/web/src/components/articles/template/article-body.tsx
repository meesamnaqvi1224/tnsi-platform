import type { ArticleBodyBlock } from '@/content/article-posts/types';
import { Callout } from '@/components/articles/template/callout';
import { Figure } from '@/components/articles/template/figure';
import { PullQuote } from '@/components/articles/template/pull-quote';

export interface ArticleBodyProps {
  blocks: ArticleBodyBlock[];
}

function renderBlock(block: ArticleBodyBlock, index: number) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p key={index} className="text-foreground mb-(--space-lg) text-lg leading-[1.8]">
          {block.text}
        </p>
      );

    case 'heading':
      if (block.level === 2) {
        return (
          <h2
            key={index}
            id={block.id}
            className="font-heading text-foreground mt-(--space-3xl) mb-(--space-lg) scroll-mt-(--space-3xl) text-3xl font-semibold tracking-tight"
          >
            {block.text}
          </h2>
        );
      }
      return (
        <h3
          key={index}
          id={block.id}
          className="font-heading text-foreground mt-(--space-2xl) mb-(--space-md) scroll-mt-(--space-3xl) text-2xl font-semibold tracking-tight"
        >
          {block.text}
        </h3>
      );

    case 'pullQuote':
      return <PullQuote key={index} quote={block.quote} attribution={block.attribution} />;

    case 'orderedList':
      return (
        <ol
          key={index}
          className="text-foreground mb-(--space-lg) list-decimal space-y-(--space-sm) pl-(--space-xl) text-lg leading-[1.8]"
        >
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );

    case 'unorderedList':
      return (
        <ul
          key={index}
          className="text-foreground mb-(--space-lg) list-disc space-y-(--space-sm) pl-(--space-xl) text-lg leading-[1.8]"
        >
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );

    case 'note':
      return (
        <p
          key={index}
          className="text-muted-foreground border-border mb-(--space-lg) border-l pl-(--space-lg) text-base leading-relaxed italic"
        >
          {block.text}
        </p>
      );

    case 'figure':
      return (
        <Figure
          key={index}
          imageAlt={block.imageAlt}
          caption={block.caption}
          variant={block.variant}
        />
      );

    case 'callout':
      return <Callout key={index} title={block.title} text={block.text} />;

    default:
      return null;
  }
}

export function ArticleBody({ blocks }: ArticleBodyProps) {
  return (
    <div className="article-body">{blocks.map((block, index) => renderBlock(block, index))}</div>
  );
}
