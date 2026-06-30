import { buttonVariants, ChapterMarker, Container, Input, Section, Stack, Text } from '@tnsi/ui';
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

            <form
              className="flex w-full flex-col gap-(--space-md) sm:flex-row"
              action="/api/newsletter"
              method="post"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <Input
                id="newsletter-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="your@email.com"
                className="h-11 flex-1"
              />
              <button type="submit" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                {newsletter.submitLabel}
              </button>
            </form>

            <Text size="xs" tone="muted" className="max-w-sm">
              {newsletter.privacyNote}
            </Text>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
