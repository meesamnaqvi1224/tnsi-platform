import type { Metadata } from 'next';
import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getPathway } from '@/content/programs';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const pathway = getPathway('organisational-advisory');
const PAGE_TITLE = pathway.title;
const PAGE_DESCRIPTION = pathway.tagline;

export const metadata: Metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/programs/organisational-advisory',
});

export default function OrganisationalAdvisoryPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      path: '/programs/organisational-advisory',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Our Pathways', path: '/programs' },
      { name: pathway.title, path: '/programs/organisational-advisory' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <Section spacing="xl" aria-labelledby="oa-hero-heading">
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
                {pathway.category}
              </p>
              <h1
                id="oa-hero-heading"
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
          aria-labelledby="oa-body-heading"
        >
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <h2 id="oa-body-heading" className="sr-only">
                About Organisational Advisory
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
          aria-labelledby="oa-ideal-heading"
        >
          <Container size="xl">
            <Stack gap="2xl">
              <Heading as="h2" id="oa-ideal-heading" size="xl">
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
          aria-labelledby="oa-cta-heading"
        >
          <Container size="xl">
            <Stack gap="xl" className="max-w-2xl">
              <Stack gap="md">
                <Heading as="h2" id="oa-cta-heading" size="xl">
                  Take the next step
                </Heading>
                <Text tone="muted" className="max-w-prose leading-relaxed">
                  Every Organisational Advisory engagement begins with a conversation. Book a
                  Discovery Call to discuss your organisation&apos;s context and needs.
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
