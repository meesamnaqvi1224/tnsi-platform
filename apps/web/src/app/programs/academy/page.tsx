import type { Metadata } from 'next';
import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getPathway } from '@/content/programs';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const pathway = getPathway('nervous-system-academy');
const PAGE_TITLE = pathway.title;
const PAGE_DESCRIPTION = pathway.tagline;

export const metadata: Metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/programs/academy',
});

export default function AcademyPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      path: '/programs/academy',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Our Pathways', path: '/programs' },
      { name: pathway.title, path: '/programs/academy' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <Section spacing="xl" aria-labelledby="academy-hero-heading">
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
                {pathway.category}
              </p>
              <h1
                id="academy-hero-heading"
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
          aria-labelledby="academy-body-heading"
        >
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <h2 id="academy-body-heading" className="sr-only">
                About the Nervous System Academy
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
          aria-labelledby="academy-ideal-heading"
        >
          <Container size="xl">
            <Stack gap="2xl">
              <Heading as="h2" id="academy-ideal-heading" size="xl">
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
          aria-labelledby="academy-cert-heading"
        >
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <Heading as="h2" id="academy-cert-heading" size="xl">
                Available today: Practitioner Certification
              </Heading>
              <Text tone="muted" className="max-w-prose leading-relaxed">
                Practitioner Certification is the Institute&apos;s current certification programme
                within the Academy — structured professional training available now.
              </Text>
              <div>
                <NextLink
                  href="/programs/practitioner-certification"
                  className={buttonVariants({ variant: 'primary', size: 'lg' })}
                >
                  Explore Practitioner Certification
                </NextLink>
              </div>
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="academy-cta-heading"
        >
          <Container size="xl">
            <Stack gap="xl" className="max-w-2xl">
              <Stack gap="md">
                <Heading as="h2" id="academy-cta-heading" size="xl">
                  Other Academy enquiries
                </Heading>
                <Text tone="muted" className="max-w-prose leading-relaxed">
                  For CPD, supervision, or other Academy enquiries, book a Discovery Call to speak
                  with the Institute.
                </Text>
              </Stack>

              <div>
                <NextLink
                  href="/book-a-call"
                  className={buttonVariants({ variant: 'outline', size: 'lg' })}
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
