import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { FeaturedArticle } from '@/components/articles/featured-article';
import { articlesContent } from '@/content/articles';

const { featured } = articlesContent;

export function ArticlesFeatured() {
  return (
    <Section spacing="none" className="border-border border-t" aria-label="Featured article">
      <Container size="xl" className="px-(--space-xl) pt-(--space-4xl) sm:px-(--space-2xl)">
        <ChapterMarker index={featured.chapter} as="h2" title="Featured Article" />
      </Container>

      <FeaturedArticle
        category={featured.category}
        publishedAt={featured.publishedAt}
        readingTime={featured.readingTime}
        title={featured.title}
        summary={featured.summary}
        imageAlt={featured.imageAlt}
        href={featured.href}
      />
    </Section>
  );
}
