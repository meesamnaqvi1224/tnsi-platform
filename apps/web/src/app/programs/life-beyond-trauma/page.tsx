import type { Metadata } from 'next';
import NextLink from 'next/link';
import { BookOpen, Gauge, LifeBuoy, Route, type LucideIcon } from 'lucide-react';
import { buttonVariants, cn, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { IdealForBand } from '@/components/programs/ideal-for-band';
import { FadeIn } from '@/components/utility/fade-in';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { getPathway } from '@/content/programs';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const pathway = getPathway('life-beyond-trauma');
const PAGE_TITLE = pathway.title;
const PAGE_DESCRIPTION = pathway.tagline;

/** Purely visual pairing of each existing audience label with a line icon. */
const idealForIcons: Record<string, LucideIcon> = {
  'Adults affected by trauma, adversity or chronic stress': LifeBuoy,
  'People who remain outwardly functional while under significant internal strain': Gauge,
  'Those who want structured education without repeated disclosure': BookOpen,
  'Individuals committed to long-term, trauma-informed development': Route,
};

export const metadata: Metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/programs/life-beyond-trauma',
});

export default function LifeBeyondTraumaPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      path: '/programs/life-beyond-trauma',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Our Pathways', path: '/programs' },
      { name: pathway.title, path: '/programs/life-beyond-trauma' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        {/* Hero — one immersive full-bleed composition, matching the other
            pathway pages: image fills the viewport, text sits directly over
            it with a bottom-to-transparent scrim. */}
        <section
          aria-labelledby="lbt-hero-heading"
          className="relative min-h-[92vh] overflow-hidden"
        >
          {'heroImageSrc' in pathway ? (
            <div className="animate-hero-ken-burns absolute inset-0">
              <ResponsiveImage
                src={pathway.heroImageSrc}
                alt={pathway.heroImageAlt}
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
            </div>
          ) : null}
          {/* The sunbeam photograph is mid-bright through its centre, so the scrim
              holds a little more strength than on the darker heroes. */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10"
            aria-hidden
          />

          <Container
            size="xl"
            className="dark text-foreground relative flex min-h-[92vh] flex-col justify-end px-(--space-xl) pt-(--space-5xl) pb-(--space-3xl) sm:px-(--space-2xl) sm:pb-(--space-4xl)"
          >
            <Stack gap="lg" className="max-w-2xl">
              <FadeIn>
                <p className="font-mono text-xs tracking-[0.25em] text-white/70 uppercase">
                  {pathway.category}
                </p>
              </FadeIn>
              <FadeIn delayMs={80}>
                <h1
                  id="lbt-hero-heading"
                  className="font-heading text-[2.75rem] leading-[1] font-semibold tracking-tight text-white sm:text-6xl lg:text-[4.5rem] xl:text-[5rem]"
                >
                  {pathway.title}
                </h1>
              </FadeIn>
              <FadeIn delayMs={160}>
                <Text className="max-w-xl text-lg leading-relaxed text-white/90">
                  {pathway.tagline}
                </Text>
              </FadeIn>
            </Stack>
          </Container>
        </section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="lbt-body-heading"
        >
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <h2 id="lbt-body-heading" className="sr-only">
                About the Life Beyond Trauma Method
              </h2>
              {pathway.paragraphs.map((paragraph) => (
                <Text key={paragraph} tone="muted" className="max-w-prose leading-relaxed">
                  {paragraph}
                </Text>
              ))}
            </Stack>
          </Container>
        </Section>

        <IdealForBand
          headingId="lbt-ideal-heading"
          items={pathway.idealFor}
          icons={idealForIcons}
          columns={2}
        />

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="lbt-cta-heading"
        >
          <Container size="xl">
            <Stack gap="xl" className="max-w-2xl">
              <Stack gap="md">
                <Heading as="h2" id="lbt-cta-heading" size="xl">
                  Take the next step
                </Heading>
                <Text tone="muted" className="max-w-prose leading-relaxed">
                  A Discovery Call is the simplest way to explore whether the Life Beyond Trauma
                  Method™ is the right pathway for you.
                </Text>
              </Stack>

              <Stack direction="row" gap="sm" wrap="wrap">
                <NextLink
                  href="/book-a-call"
                  className={buttonVariants({ variant: 'primary', size: 'lg' })}
                >
                  Book a Discovery Call
                </NextLink>
                {'externalCta' in pathway ? (
                  <a
                    href={pathway.externalCta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'bg-card')}
                  >
                    {pathway.externalCta.label} ↗
                  </a>
                ) : null}
              </Stack>
            </Stack>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
