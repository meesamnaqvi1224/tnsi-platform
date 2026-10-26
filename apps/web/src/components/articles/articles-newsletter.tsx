import { Container, Section } from '@tnsi/ui';
import { NewsletterForm } from '@/components/utility/newsletter-form';
import { articlesContent } from '@/content/articles';

const { newsletter } = articlesContent;

/**
 * Two columns on a wide screen: the invitation on the left, the form on the
 * right, on a faint tint so the band reads as its own moment between the list
 * and the closing statement. One column on a phone.
 */
export function ArticlesNewsletter() {
  return (
    <Section
      spacing="none"
      className="border-border bg-secondary/40 border-y"
      aria-labelledby="articles-newsletter-heading"
    >
      <Container
        size="xl"
        className="grid grid-cols-1 gap-x-(--space-3xl) gap-y-(--space-xl) py-(--space-3xl) lg:grid-cols-12 lg:items-end lg:py-(--space-4xl)"
      >
        <div className="flex flex-col gap-(--space-lg) lg:col-span-5">
          <h2
            id="articles-newsletter-heading"
            className="font-heading text-foreground text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl"
          >
            {newsletter.heading}
          </h2>
          <p className="text-muted-foreground max-w-[44ch] leading-relaxed text-pretty">
            {newsletter.description}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-(--space-md) lg:col-span-6 lg:col-start-7">
          <NewsletterForm idPrefix="articles-newsletter" submitLabel={newsletter.submitLabel} />
          <p className="text-muted-foreground max-w-[52ch] text-xs leading-relaxed">
            {newsletter.privacyNote}
          </p>
        </div>
      </Container>
    </Section>
  );
}
