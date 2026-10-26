import { Container, Section } from '@tnsi/ui';
import { FeaturedArticle } from '@/components/articles/featured-article';
import { articlesContent } from '@/content/articles';

const { featured } = articlesContent;

export function ArticlesFeatured() {
  return (
    <Section
      spacing="none"
      className="border-border border-b"
      aria-labelledby="articles-featured-heading"
    >
      <Container
        size="xl"
        className="flex flex-col gap-(--space-2xl) py-(--space-3xl) lg:py-(--space-4xl)"
      >
        <h2
          id="articles-featured-heading"
          className="text-muted-foreground font-mono text-[0.6875rem] font-normal tracking-[0.18em] uppercase"
        >
          Featured Article
        </h2>

        <FeaturedArticle
          category={featured.category}
          publishedAt={featured.publishedAt}
          readingTime={featured.readingTime}
          title={featured.title}
          summary={featured.summary}
          imageSrc={featured.imageSrc}
          imageAlt={featured.imageAlt}
          href={featured.href}
        />
      </Container>
    </Section>
  );
}
