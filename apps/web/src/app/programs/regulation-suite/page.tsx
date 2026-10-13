import type { Metadata } from 'next';
import NextLink from 'next/link';
import { BatteryLow, DoorOpen, Sprout, Zap, type LucideIcon } from 'lucide-react';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { IdealForBand } from '@/components/programs/ideal-for-band';
import { EditorialImage } from '@/components/utility/editorial-image';
import { FadeIn } from '@/components/utility/fade-in';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { getPathway } from '@/content/programs';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const pathway = getPathway('regulation-suite');
const PAGE_TITLE = pathway.title;
const PAGE_DESCRIPTION = pathway.tagline;

/** Purely visual pairing of each existing audience label with a line icon. */
const idealForIcons: Record<string, LucideIcon> = {
  'People experiencing everyday stress, overwhelm or reduced capacity': BatteryLow,
  'Immediate, practical regulation support': Zap,
  'Building longer-term nervous-system awareness': Sprout,
  'An accessible entry point before deciding on a more structured programme such as The Life Beyond Trauma Method™':
    DoorOpen,
};

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
        {/* Hero — one immersive full-bleed composition, matching the Private
            Executive Advisory treatment: image fills the viewport, text sits
            directly over it with a bottom-to-transparent scrim. */}
        <section
          aria-labelledby="rs-hero-heading"
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
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
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
                  id="rs-hero-heading"
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

        {/* Body copy — a thin rule anchors the running category marker beside the paragraphs */}
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
                <div className="flex flex-col gap-(--space-sm)">
                  <p className="text-muted-foreground font-mono text-xs tracking-[0.25em] uppercase">
                    {pathway.category}
                  </p>
                  <div className="bg-foreground/15 h-12 w-px" aria-hidden />
                </div>
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

        <IdealForBand
          headingId="rs-ideal-heading"
          items={pathway.idealFor}
          icons={idealForIcons}
          columns={2}
        />

        {/* Final CTA — wide editorial closing panel; the existing nav/card photo
            of the same notebook scene gives the panel a visual counterpart
            without introducing a new image. */}
        <Section
          className="border-foreground/15 border-t py-(--space-3xl) sm:py-(--space-4xl)"
          aria-labelledby="rs-cta-heading"
        >
          <Container size="xl">
            <div className="grid grid-cols-1 items-center gap-(--space-3xl) lg:grid-cols-[55fr_45fr] lg:gap-(--space-4xl)">
              <FadeIn>
                <Stack gap="xl" className="max-w-xl">
                  <Stack gap="md">
                    <h2
                      id="rs-cta-heading"
                      className="font-heading text-foreground text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl lg:text-6xl"
                    >
                      Not yet open for enrolment
                    </h2>
                    <Text size="lg" tone="muted" className="max-w-prose leading-relaxed">
                      The Regulation Suite™ is not yet available for enrolment. In the meantime,
                      book a Discovery Call to discuss your nervous system education options with
                      the Institute.
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

              {'imageSrc' in pathway && pathway.imageSrc ? (
                <FadeIn delayMs={120} className="hidden lg:block">
                  <EditorialImage
                    src={pathway.imageSrc}
                    alt={pathway.imageAlt}
                    aspect="landscape"
                    className="rounded-lg"
                    sizes="40vw"
                  />
                </FadeIn>
              ) : null}
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
