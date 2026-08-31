import type { Metadata } from 'next';
import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { applyPractitionerCertificationContent } from '@/content/apply-practitioner-certification';
import { practitionerCertificationContent } from '@/content/practitioner-certification';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const { seo, hero, nextSteps, note } = applyPractitionerCertificationContent;
const { audience } = practitionerCertificationContent;

export const metadata: Metadata = createPageMetadata({
  title: 'Apply for Practitioner Certification',
  description: seo.description,
  path: '/apply/practitioner-certification',
});

export default function ApplyPractitionerCertificationPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: 'Apply for Practitioner Certification',
      description: seo.description,
      path: '/apply/practitioner-certification',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Programs', path: '/programs' },
      { name: 'Practitioner Certification', path: '/programs/practitioner-certification' },
      { name: 'Apply', path: '/apply/practitioner-certification' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <Section spacing="xl" aria-labelledby="apc-hero-heading">
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
                {hero.eyebrow}
              </p>
              <h1
                id="apc-hero-heading"
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
          className="border-foreground/15 border-t"
          aria-labelledby="apc-who-heading"
        >
          <Container size="xl">
            <Stack gap="2xl">
              <Stack gap="sm" className="max-w-2xl">
                <Heading as="h2" id="apc-who-heading" size="xl">
                  Who this is for
                </Heading>
                <Text tone="muted" className="leading-relaxed">
                  {audience.heading}
                </Text>
              </Stack>

              <ul className="flex flex-wrap gap-(--space-sm)" aria-label="Professional audiences">
                {audience.professions.map((profession) => (
                  <li
                    key={profession}
                    className="border-foreground/15 text-foreground rounded-full border px-(--space-md) py-(--space-xs) text-sm"
                  >
                    {profession}
                  </li>
                ))}
              </ul>

              <Text tone="muted" className="max-w-3xl leading-relaxed">
                {audience.closingCopy}
              </Text>
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="apc-next-heading"
        >
          <Container size="xl">
            <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_2fr] lg:gap-(--space-4xl)">
              <div />

              <Stack gap="xl">
                <Stack gap="md">
                  <Heading as="h2" id="apc-next-heading" size="xl">
                    {nextSteps.heading}
                  </Heading>
                  <Stack gap="md">
                    {nextSteps.paragraphs.map((paragraph) => (
                      <Text key={paragraph} tone="muted" className="max-w-prose leading-relaxed">
                        {paragraph}
                      </Text>
                    ))}
                  </Stack>
                </Stack>

                <Stack direction="row" gap="sm" wrap="wrap">
                  <NextLink
                    href={nextSteps.primaryCta.href}
                    className={buttonVariants({ variant: 'primary', size: 'lg' })}
                  >
                    {nextSteps.primaryCta.label}
                  </NextLink>
                  <NextLink
                    href={nextSteps.secondaryCta.href}
                    className={buttonVariants({ variant: 'outline', size: 'lg' })}
                  >
                    {nextSteps.secondaryCta.label}
                  </NextLink>
                </Stack>

                <Text size="sm" tone="muted">
                  {note}
                </Text>
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
