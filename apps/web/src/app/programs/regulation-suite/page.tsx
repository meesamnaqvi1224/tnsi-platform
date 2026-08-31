import type { Metadata } from 'next';
import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
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
        <Section spacing="xl" aria-labelledby="rs-hero-heading">
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
                {pathway.category}
              </p>
              <h1
                id="rs-hero-heading"
                className="font-heading text-foreground text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl"
              >
                {pathway.title}
              </h1>
              <Text size="lg" tone="muted" className="max-w-prose leading-relaxed">
                {pathway.tagline}
              </Text>
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="rs-body-heading"
        >
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <h2 id="rs-body-heading" className="sr-only">
                About the Regulation Suite
              </h2>
              {pathway.paragraphs.map((paragraph) => (
                <Text key={paragraph} tone="muted" className="max-w-prose leading-relaxed">
                  {paragraph}
                </Text>
              ))}
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="rs-ideal-heading"
        >
          <Container size="xl">
            <Stack gap="2xl">
              <Heading as="h2" id="rs-ideal-heading" size="xl">
                Ideal for
              </Heading>
              <ul className="flex flex-wrap gap-(--space-sm)" aria-label="Ideal for">
                {pathway.idealFor.map((item) => (
                  <li
                    key={item}
                    className="border-foreground/15 text-foreground rounded-full border px-(--space-md) py-(--space-xs) text-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="rs-cta-heading"
        >
          <Container size="xl">
            <Stack gap="xl" className="max-w-2xl">
              <Stack gap="md">
                <Heading as="h2" id="rs-cta-heading" size="xl">
                  Not yet open for enrolment
                </Heading>
                <Text tone="muted" className="max-w-prose leading-relaxed">
                  The Regulation Suite™ is not yet available for enrolment. In the meantime, book a
                  Discovery Call to discuss your nervous system education options with the
                  Institute.
                </Text>
              </Stack>

              <div>
                <NextLink
                  href="/book-a-call"
                  className={buttonVariants({ variant: 'primary', size: 'lg' })}
                >
                  Book a Discovery Call
                </NextLink>
              </div>
            </Stack>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
