import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { NewsletterForm } from '@/components/utility/newsletter-form';
import { articlesContent } from '@/content/articles';

const { newsletter } = articlesContent;

export function ArticlesNewsletter() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={newsletter.heading}>
      <Container size="xl">
        <div className="mx-auto max-w-xl">
          <Stack gap="2xl" className="items-center text-center">
            <ChapterMarker index={newsletter.chapter} as="h2" title={newsletter.heading} />

            <Text tone="muted" className="leading-relaxed">
              {newsletter.description}
            </Text>

            <NewsletterForm idPrefix="articles-newsletter" submitLabel={newsletter.submitLabel} />

            <Text size="xs" tone="muted" className="max-w-sm">
              {newsletter.privacyNote}
            </Text>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
