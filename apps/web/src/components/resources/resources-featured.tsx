import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { FeaturedResource } from '@/components/resources/featured-resource';
import { resourcesContent } from '@/content/resources';

const { featured } = resourcesContent;

export function ResourcesFeatured() {
  return (
    <Section spacing="none" className="border-border border-t" aria-label="Featured resource">
      <Container size="xl" className="px-(--space-xl) pt-(--space-4xl) sm:px-(--space-2xl)">
        <ChapterMarker index={featured.chapter} as="h2" title="Featured Resource" />
      </Container>

      <FeaturedResource
        title={featured.title}
        description={featured.description}
        imageSrc={featured.imageSrc}
        imageAlt={featured.imageAlt}
        href={featured.href}
        cta={featured.cta}
      />
    </Section>
  );
}
