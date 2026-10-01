import type { Metadata } from 'next';
import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { EditorialImage } from '@/components/utility/editorial-image';
import { FadeIn } from '@/components/utility/fade-in';
import { getPathway } from '@/content/programs';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const pathway = getPathway('regulation-suite');
const PAGE_TITLE = pathway.title;
const PAGE_DESCRIPTION = pathway.tagline;

export const metadata: Metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/programs/regulation-suite',
});

export default function RegulationSuitePage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      path: '/programs/regulation-suite',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Our Pathways', path: '/programs' },
      { name: pathway.title, path: '/programs/regulation-suite' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        {/* Hero — heading and image treated as one composition, tight gap between them */}
        <Section
          className="pt-(--space-3xl) pb-(--space-lg) sm:pt-(--space-4xl) sm:pb-(--space-xl)"
          aria-labelledby="rs-hero-heading"
        >
          <Container size="xl">
            <Stack gap="lg" className="max-w-3xl">
              <FadeIn>
                <p className="text-muted-foreground font-mono text-xs tracking-[0.25em] uppercase">
                  {pathway.category}
                </p>
              </FadeIn>
              <FadeIn delayMs={80}>
                <h1
                  id="rs-hero-heading"
                  className="font-heading text-foreground text-[2.75rem] leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-7xl"
                >
                  {pathway.title}
                </h1>
              </FadeIn>
              <FadeIn delayMs={160}>
                <Text size="lg" tone="muted" className="max-w-xl leading-relaxed">
                  {pathway.tagline}
                </Text>
              </FadeIn>
            </Stack>
          </Container>
        </Section>

        {'heroImageSrc' in pathway ? (
          <Section className="pb-(--space-3xl) sm:pb-(--space-4xl)" aria-label={pathway.title}>
            <Container size="xl">
              <FadeIn delayMs={200}>
                <EditorialImage
                  src={pathway.heroImageSrc}
                  alt={pathway.heroImageAlt}
                  aspect="landscape"
                  className="rounded-lg"
                  priority
                  sizes="(max-width: 1024px) 100vw, 1280px"
                />
              </FadeIn>
            </Container>
          </Section>
        ) : null}

        {/* Body copy — the category label stands as a quiet running marker beside the paragraphs */}
        <Section
          className="border-foreground/15 border-t py-(--space-2xl) sm:py-(--space-3xl)"
          aria-labelledby="rs-body-heading"
        >
          <Container size="xl">
            <h2 id="rs-body-heading" className="sr-only">
              About the Regulation Suite
            </h2>
            <div className="grid grid-cols-1 gap-(--space-xl) lg:grid-cols-[1fr_2.5fr] lg:gap-(--space-3xl)">
              <FadeIn>
                <p className="text-muted-foreground font-mono text-xs tracking-[0.25em] uppercase">
                  {pathway.category}
                </p>
              </FadeIn>
              <FadeIn delayMs={100}>
                <Stack gap="lg" className="max-w-[65ch]">
                  {pathway.paragraphs.map((paragraph) => (
                    <Text key={paragraph} size="lg" tone="muted" className="leading-[1.7]">
                      {paragraph}
                    </Text>
                  ))}
                </Stack>
              </FadeIn>
            </div>
          </Container>
        </Section>

        {/* Ideal for — a quiet typographic list rather than pills, content unchanged */}
        <Section
          className="border-foreground/15 border-t py-(--space-2xl) sm:py-(--space-3xl)"
          aria-labelledby="rs-ideal-heading"
        >
          <Container size="xl">
            <div className="grid grid-cols-1 gap-(--space-xl) lg:grid-cols-[1fr_2.5fr] lg:gap-(--space-3xl)">
              <FadeIn>
                <Heading as="h2" id="rs-ideal-heading" size="xl">
                  Ideal for
                </Heading>
              </FadeIn>
              <FadeIn delayMs={100}>
                <ul
                  className="grid grid-cols-1 gap-x-(--space-2xl) gap-y-0 sm:grid-cols-2"
                  aria-label="Ideal for"
                >
                  {pathway.idealFor.map((item) => (
                    <li
                      key={item}
                      className="border-foreground/15 text-foreground border-t py-(--space-md) text-base leading-relaxed"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeIn>
            </div>
          </Container>
        </Section>

        {/* Final CTA — the strongest closing moment on the page */}
        <Section
          className="border-foreground/15 border-t py-(--space-3xl) sm:py-(--space-4xl)"
          aria-labelledby="rs-cta-heading"
        >
          <Container size="xl">
            <FadeIn>
              <Stack gap="xl" className="max-w-2xl">
                <Stack gap="md">
                  <h2
                    id="rs-cta-heading"
                    className="font-heading text-foreground text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem]"
                  >
                    Not yet open for enrolment
                  </h2>
                  <Text size="lg" tone="muted" className="max-w-prose leading-relaxed">
                    The Regulation Suite™ is not yet available for enrolment. In the meantime, book
                    a Discovery Call to discuss your nervous system education options with the
                    Institute.
                  </Text>
                </Stack>

                <div className="pt-(--space-sm)">
                  <NextLink
                    href="/book-a-call"
                    className={buttonVariants({ variant: 'primary', size: 'lg' })}
                  >
                    Book a Discovery Call
                  </NextLink>
                </div>
              </Stack>
            </FadeIn>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
