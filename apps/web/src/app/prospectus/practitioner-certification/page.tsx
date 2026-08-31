import type { Metadata } from 'next';
import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { prospectusPractitionerCertificationContent } from '@/content/prospectus-practitioner-certification';
import { practitionerCertificationContent } from '@/content/practitioner-certification';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const { seo, hero, cta } = prospectusPractitionerCertificationContent;
const { purpose, audience, curriculum, outcomes } = practitionerCertificationContent;

export const metadata: Metadata = createPageMetadata({
  title: 'Practitioner Certification — Programme Overview',
  description: seo.description,
  path: '/prospectus/practitioner-certification',
});

export default function ProspectusPractitionerCertificationPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: 'Practitioner Certification — Programme Overview',
      description: seo.description,
      path: '/prospectus/practitioner-certification',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Programs', path: '/programs' },
      { name: 'Practitioner Certification', path: '/programs/practitioner-certification' },
      { name: 'Programme Overview', path: '/prospectus/practitioner-certification' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <Section spacing="xl" aria-labelledby="ppc-hero-heading">
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
                {hero.eyebrow}
              </p>
              <h1
                id="ppc-hero-heading"
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
          aria-labelledby="ppc-purpose-heading"
        >
          <Container size="xl">
            <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-4xl)">
              <Heading as="h2" id="ppc-purpose-heading" size="xl">
                {purpose.heading}
              </Heading>
              <Stack gap="lg">
                {purpose.paragraphs.map((paragraph) => (
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
          className="border-foreground/15 border-t"
          aria-labelledby="ppc-audience-heading"
        >
          <Container size="xl">
            <Stack gap="2xl">
              <Heading as="h2" id="ppc-audience-heading" size="xl">
                {audience.heading}
              </Heading>

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
          aria-labelledby="ppc-curriculum-heading"
        >
          <Container size="xl">
            <Stack gap="2xl">
              <Stack gap="lg" className="max-w-2xl">
                <Heading as="h2" id="ppc-curriculum-heading" size="xl">
                  {curriculum.heading}
                </Heading>
                <Text tone="muted" className="leading-relaxed">
                  {curriculum.intro}
                </Text>
              </Stack>

              <ol
                className="grid grid-cols-1 gap-(--space-lg) sm:grid-cols-2"
                aria-label="Certification curriculum modules"
              >
                {curriculum.modules.map((module) => (
                  <li
                    key={module.number}
                    className="border-foreground/15 flex items-start gap-(--space-md) border-t pt-(--space-lg)"
                  >
                    <span className="text-muted-foreground font-mono text-xs tabular-nums">
                      {String(module.number).padStart(2, '0')}
                    </span>
                    <p className="font-heading text-foreground text-lg font-semibold tracking-tight">
                      {module.title}
                    </p>
                  </li>
                ))}
              </ol>
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="ppc-outcomes-heading"
        >
          <Container size="xl">
            <Stack gap="2xl">
              <Heading as="h2" id="ppc-outcomes-heading" size="xl">
                {outcomes.heading}
              </Heading>

              <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-4xl)">
                <div className="border-foreground/15 flex flex-col gap-(--space-lg) border-t pt-(--space-xl)">
                  <p className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
                    {outcomes.before.label}
                  </p>
                  <ul className="flex flex-col gap-(--space-md)" role="list">
                    {outcomes.before.items.map((item) => (
                      <li
                        key={item}
                        className="text-muted-foreground font-heading text-base font-semibold tracking-tight"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-foreground/15 flex flex-col gap-(--space-lg) border-t pt-(--space-xl)">
                  <p className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
                    {outcomes.after.label}
                  </p>
                  <ul className="flex flex-col gap-(--space-md)" role="list">
                    {outcomes.after.items.map((item) => (
                      <li
                        key={item}
                        className="text-foreground font-heading text-base font-semibold tracking-tight"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="ppc-cta-heading"
        >
          <Container size="xl">
            <Stack gap="xl" className="max-w-2xl">
              <Stack gap="md">
                <Heading as="h2" id="ppc-cta-heading" size="xl">
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
