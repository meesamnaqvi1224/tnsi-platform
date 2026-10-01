import { Container, Heading, Section, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { FadeIn } from '@/components/utility/fade-in';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { areas } = executiveAdvisoryContent;

/**
 * One image per panel, imported here rather than stored in content.ts —
 * these are purely a visual decision (which existing photograph pairs with
 * which concept), not approved copy, so they stay out of the CMS-shaped
 * content file. Four distinct photographs, two reused once each but never
 * on adjacent panels, so the alternating rhythm never repeats back to back.
 */
const panelImages: Record<string, { src: string; alt: string }> = {
  'capacity-audit': {
    src: '/images/resources/card-executive.webp',
    alt: 'An open notebook, pen, and coffee on a quiet desk beside a window.',
  },
  'somatic-load-mapping': {
    src: '/images/contact/office.webp',
    alt: 'A calm, architectural interior with a wall of glass opening onto trees.',
  },
  'advisory-dossier': {
    src: '/images/home/program-executive.webp',
    alt: 'Two women in quiet conversation at a wooden table, notebook open between them.',
  },
  'capacity-recalibration-model': {
    src: '/images/programs/featured-executive.webp',
    alt: 'Four women in conversation around a table in a sunlit meeting room.',
  },
  'weekly-monitoring': {
    src: '/images/home/program-executive.webp',
    alt: 'Two women in quiet conversation at a wooden table, notebook open between them.',
  },
  'continuation-plan': {
    src: '/images/contact/office.webp',
    alt: 'A calm, architectural interior with a wall of glass opening onto trees.',
  },
};

export function EaAreas() {
  return (
    <Section
      id="ea-advisory"
      className="border-border scroll-mt-36 border-t py-(--space-4xl) sm:py-(--space-5xl)"
      aria-label={areas.heading}
    >
      <Container size="xl">
        <FadeIn>
          <Heading
            as="h2"
            size="xl"
            className="mb-(--space-4xl) max-w-2xl text-4xl sm:text-5xl lg:text-6xl"
          >
            {areas.heading}
          </Heading>
        </FadeIn>

        <div className="flex flex-col">
          {areas.panels.map((panel, index) => {
            const isReversed = index % 2 === 1;
            const image = panelImages[panel.id];
            return (
              <article
                key={panel.id}
                className="border-foreground/15 grid grid-cols-1 items-center gap-(--space-2xl) border-t py-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-4xl) lg:py-(--space-4xl)"
              >
                <FadeIn className={isReversed ? 'lg:order-2' : ''}>
                  <div className="flex flex-col gap-(--space-md)">
                    <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-heading text-foreground text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem]">
                      {panel.title}
                    </h3>
                    <Text tone="muted" className="max-w-prose leading-relaxed">
                      {panel.description}
                    </Text>
                  </div>
                </FadeIn>

                {image ? (
                  <FadeIn delayMs={120} className={isReversed ? 'lg:order-1' : ''}>
                    <EditorialImage
                      src={image.src}
                      alt={image.alt}
                      aspect="landscape"
                      className="rounded-lg"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </FadeIn>
                ) : null}
              </article>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
