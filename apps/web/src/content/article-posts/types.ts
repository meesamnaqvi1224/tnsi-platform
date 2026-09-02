/**
 * Article post content types — shaped for future Sanity Portable Text integration.
 * Each block type maps to a Portable Text block or custom block component.
 */

export type ArticleBodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string; id: string }
  | { type: 'pullQuote'; quote: string; attribution?: string }
  | { type: 'orderedList'; items: string[] }
  | { type: 'unorderedList'; items: string[] }
  | { type: 'note'; text: string }
  | {
      type: 'figure';
      imageAlt: string;
      imageSrc?: string;
      caption: string;
      variant: 'inline' | 'full';
    }
  | { type: 'callout'; title?: string; text: string };

export interface ArticleAuthor {
  name: string;
  role: string;
  biography: string;
  imageAlt: string;
  imageSrc?: string;
  href: string;
}

export interface RelatedArticle {
  slug: string;
  category: string;
  title: string;
  summary: string;
  imageAlt: string;
  imageSrc?: string;
}

export interface ArticlePost {
  slug: string;
  seo: {
    title: string;
    description: string;
  };
  hero: {
    category: string;
    publishedAt: string;
    readingTime: string;
    headline: string;
    subtitle: string;
    imageAlt: string;
    imageSrc?: string;
    author: {
      name: string;
      role: string;
    };
  };
  body: ArticleBodyBlock[];
  /** Not part of the Sanity `article` schema — only the static demo template supplies these. */
  takeaways?: string[];
  author: ArticleAuthor;
  related: RelatedArticle[];
  /** Not part of the Sanity `article` schema — only the static demo template supplies this. */
  footerQuote?: {
    quote: string;
    author: string;
  };
}
