import type { Metadata } from 'next';
import NextLink from 'next/link';
import {
  Building2,
  GraduationCap,
  HeartPulse,
  Landmark,
  Network,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { IdealForBand } from '@/components/programs/ideal-for-band';
import { FadeIn } from '@/components/utility/fade-in';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { getPathway } from '@/content/programs';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const pathway = getPathway('organisational-advisory');
const PAGE_TITLE = pathway.title;
const PAGE_DESCRIPTION = pathway.tagline;

/** Purely visual pairing of each existing audience label with a line icon. */
const idealForIcons: Record<string, LucideIcon> = {
  'Leadership teams': Users,
  'Organisations addressing systemic pressure': Network,
  'Public sector': Landmark,
  Healthcare: HeartPulse,
  Education: GraduationCap,
  'Corporate organisations': Building2,
};

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
        {/* Hero — one immersive full-bleed composition, matching the other
            pathway pages: image fills the viewport, text sits directly over
            it with a bottom-to-transparent scrim. */}
        <section
          aria-labelledby="oa-hero-heading"
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
          {/* This photograph is much brighter than the other pathway heroes, so the
              scrim holds its strength higher up to keep white text accessible. */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/10"
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
                  id="oa-hero-heading"
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

        {/* Body copy — the category label stands as a quiet running marker beside the paragraphs */}
        <Section
          className="border-foreground/15 border-t py-(--space-2xl) sm:py-(--space-3xl)"
          aria-labelledby="oa-body-heading"
        >
          <Container size="xl">
            <h2 id="oa-body-heading" className="sr-only">
              About the System-Level Executive Advisory
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

        <IdealForBand
          headingId="oa-ideal-heading"
          items={pathway.idealFor}
          icons={idealForIcons}
          columns={3}
        />

        {/* Final CTA — the strongest closing moment on the page */}
        <Section
          className="border-foreground/15 border-t py-(--space-3xl) sm:py-(--space-4xl)"
          aria-labelledby="oa-cta-heading"
        >
          <Container size="xl">
            <FadeIn>
              <Stack gap="xl" className="max-w-2xl">
                <Stack gap="md">
                  <h2
                    id="oa-cta-heading"
                    className="font-heading text-foreground text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem]"
                  >
                    Take the next step
                  </h2>
                  <Text size="lg" tone="muted" className="max-w-prose leading-relaxed">
                    Every System-Level Executive Advisory engagement begins with a conversation.
                    Book a Discovery Call to discuss your organisation&apos;s context and needs.
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
