import NextLink from 'next/link';
import { buttonVariants, Container, Section } from '@tnsi/ui';
import { articlesContent } from '@/content/articles';

const { closing } = articlesContent;

/**
 * The closing statement: set large and left-aligned in the serif, with the two
 * existing actions beneath it. It is the last thing before the quotation and
 * the footer, so it gets room rather than decoration.
 */
export function ArticlesClosing() {
  return (
    <Section spacing="none" aria-labelledby="articles-closing-heading">
      <Container
        size="xl"
        className="flex flex-col gap-(--space-2xl) py-(--space-4xl) lg:py-(--space-5xl)"
      >
        <h2
          id="articles-closing-heading"
          className="font-heading text-foreground max-w-[22ch] text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
        >
          {closing.headline}
        </h2>

        <div className="flex flex-wrap gap-(--space-sm)">
          <NextLink
            href={closing.primaryCta.href}
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
          >
            {closing.primaryCta.label}
          </NextLink>
          <NextLink
            href={closing.secondaryCta.href}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            {closing.secondaryCta.label}
          </NextLink>
        </div>
      </Container>
    </Section>
  );
}
