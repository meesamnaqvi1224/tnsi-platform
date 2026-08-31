import type { Metadata } from 'next';
import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { prospectusExecutiveAdvisoryContent } from '@/content/prospectus-executive-advisory';
import { executiveAdvisoryContent } from '@/content/executive-advisory';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const { seo, hero, cta } = prospectusExecutiveAdvisoryContent;
const { challenge, audience, areas } = executiveAdvisoryContent;

export const metadata: Metadata = createPageMetadata({
  title: 'Executive Advisory — Programme Overview',
  description: seo.description,
  path: '/prospectus/executive-advisory',
});

export default function ProspectusExecutiveAdvisoryPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: 'Executive Advisory — Programme Overview',
      description: seo.description,
      path: '/prospectus/executive-advisory',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Programs', path: '/programs' },
      { name: 'Executive Advisory', path: '/programs/executive-advisory' },
      { name: 'Programme Overview', path: '/prospectus/executive-advisory' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <Section spacing="xl" aria-labelledby="pea-hero-heading">
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
                {hero.eyebrow}
              </p>
              <h1
                id="pea-hero-heading"
                className="font-heading text-foreground text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl"
              >
                {hero.headline}
              </h1>
              <Text size="lg" tone="muted" className="max-w-prose leading-relaxed">
                {hero.supportingCopy}
              </Text>
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-border border-t"
          aria-labelledby="pea-context-heading"
        >
          <Container size="xl">
            <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_1.1fr] lg:gap-(--space-5xl)">
              <Heading as="h2" id="pea-context-heading" size="xl">
                {challenge.heading}
              </Heading>
              <Stack gap="xl">
                {challenge.paragraphs.map((paragraph) => (
                  <Text key={paragraph} tone="muted" className="text-base leading-relaxed">
                    {paragraph}
                  </Text>
                ))}
              </Stack>
            </div>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-border bg-secondary/40 border-t"
          aria-labelledby="pea-audience-heading"
        >
          <Container size="xl">
            <Stack gap="2xl">
              <Heading as="h2" id="pea-audience-heading" size="xl">
                {audience.heading}
              </Heading>

              <div
                className="grid grid-cols-1 gap-(--space-2xl) md:grid-cols-2 lg:grid-cols-3"
                role="list"
                aria-label="Executive audiences"
              >
                {audience.cards.map((card) => (
                  <article
                    key={card.title}
                    role="listitem"
                    className="flex flex-col gap-(--space-md)"
                  >
                    <h3 className="font-heading text-foreground text-xl font-semibold tracking-tight">
                      {card.title}
                    </h3>
                    <Text tone="muted" size="sm" className="leading-relaxed">
                      {card.description}
                    </Text>
                  </article>
                ))}
              </div>
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-border border-t"
          aria-labelledby="pea-areas-heading"
        >
          <Container size="xl">
            <Stack gap="2xl">
              <Heading as="h2" id="pea-areas-heading" size="xl">
                {areas.heading}
              </Heading>

              <ul className="flex flex-col" aria-label="Advisory areas">
                {areas.panels.map((panel) => (
                  <li
                    key={panel.id}
                    className="border-border flex flex-col gap-(--space-sm) border-t py-(--space-xl)"
                  >
                    <h3 className="font-heading text-foreground text-lg font-semibold tracking-tight">
                      {panel.title}
                    </h3>
                    <Text tone="muted" size="sm" className="max-w-prose leading-relaxed">
                      {panel.description}
                    </Text>
                  </li>
                ))}
              </ul>
            </Stack>
          </Container>
        </Section>

        <Section spacing="xl" className="border-border border-t" aria-labelledby="pea-cta-heading">
          <Container size="xl">
            <Stack gap="xl" className="max-w-2xl">
              <Stack gap="md">
                <Heading as="h2" id="pea-cta-heading" size="xl">
                  {cta.heading}
                </Heading>
                <Text tone="muted" className="max-w-prose leading-relaxed">
                  {cta.supportingCopy}
                </Text>
              </Stack>

              <Stack direction="row" gap="sm" wrap="wrap">
                <NextLink
                  href={cta.primaryCta.href}
                  className={buttonVariants({ variant: 'primary', size: 'lg' })}
                >
                  {cta.primaryCta.label}
                </NextLink>
                <NextLink
                  href={cta.secondaryCta.href}
                  className={buttonVariants({ variant: 'outline', size: 'lg' })}
                >
                  {cta.secondaryCta.label}
                </NextLink>
              </Stack>
            </Stack>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
