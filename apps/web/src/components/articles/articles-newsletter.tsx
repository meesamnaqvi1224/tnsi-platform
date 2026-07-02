import {
  buttonVariants,
  ChapterMarker,
  cn,
  Container,
  Input,
  Section,
  Stack,
  Text,
} from '@tnsi/ui';
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

            <form
              className="flex w-full min-w-0 flex-col gap-(--space-md) sm:flex-row sm:items-stretch"
              action="/api/newsletter"
              method="post"
            >
              <label htmlFor="articles-newsletter-email" className="sr-only">
                Email address
              </label>
              <Input
                id="articles-newsletter-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="your@email.com"
                className="h-11 min-w-0 flex-1"
              />
              <button
                type="submit"
                className={cn(
                  buttonVariants({ variant: 'primary', size: 'lg' }),
                  'w-full shrink-0 sm:w-auto',
                )}
              >
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
