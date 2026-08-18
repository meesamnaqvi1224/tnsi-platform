import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { NewsletterForm } from '@/components/utility/newsletter-form';
import { resourcesContent } from '@/content/resources';

const { newsletter } = resourcesContent;

export function ResourcesNewsletter() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={newsletter.heading}>
      <Container size="xl">
        <div className="mx-auto max-w-xl">
          <Stack gap="2xl" className="items-center text-center">
            <ChapterMarker index={newsletter.chapter} as="h2" title={newsletter.heading} />

            <Text tone="muted" className="leading-relaxed">
              {newsletter.description}
            </Text>

            <NewsletterForm idPrefix="resources-newsletter" submitLabel={newsletter.submitLabel} />

            <Text size="xs" tone="muted" className="max-w-sm">
              {newsletter.privacyNote}
            </Text>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
