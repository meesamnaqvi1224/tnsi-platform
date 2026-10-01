import NextLink from 'next/link';
import { buttonVariants, cn, Section, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { FadeIn } from '@/components/utility/fade-in';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { founder, footerQuote } = executiveAdvisoryContent;

/**
 * The large pull-quote here is `footerQuote` — already-approved copy that
 * otherwise only appeared once, quietly, at the very bottom of the page via
 * `PageQuote`. Reusing it prominently here (rather than inventing a new
 * "philosophical statement") connects Caroline directly to the advisory's
 * philosophy without adding a single new claim. `PageQuote` still closes
 * the page afterwards — a quiet bookend, not a duplicate.
 */
export function EaFounder() {
  return (
    <Section className="border-border border-t">
      <div className="grid grid-cols-1 lg:grid-cols-[44fr_56fr]">
        <FadeIn as="div">
          <EditorialImage
            src={founder.imageSrc}
            alt={founder.imageAlt}
            aspect="portrait"
            className="min-h-[24rem] rounded-none lg:h-full lg:max-h-[42rem]"
            sizes="(max-width: 1024px) 100vw, 44vw"
          />
        </FadeIn>

        <div className="flex items-center px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl) lg:px-(--space-4xl)">
          <FadeIn delayMs={100} className="max-w-xl">
            <p className="text-muted-foreground mb-(--space-lg) font-mono text-xs tracking-[0.2em] uppercase">
              {founder.heading}
            </p>
            <p className="font-heading text-foreground mb-(--space-xl) text-4xl leading-[1.2] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem]">
              &ldquo;{footerQuote.quote}&rdquo;
            </p>
            <div className="flex flex-col gap-(--space-lg)">
              {founder.paragraphs.map((paragraph) => (
                <Text key={paragraph} tone="muted" size="lg" className="leading-relaxed">
                  {paragraph}
                </Text>
              ))}
            </div>
            <NextLink
              href={founder.cta.href}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'mt-(--space-xl)')}
            >
              {founder.cta.label}
            </NextLink>
          </FadeIn>
        </div>
      </div>
    </Section>
  );
}
