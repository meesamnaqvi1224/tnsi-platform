import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { programsOverviewContent } from '@/content/programs';

const { navigation } = programsOverviewContent;

function DestinationCard({
  title,
  description,
  href,
  cta,
  imageSrc,
  imageAlt,
}: (typeof navigation)[number]) {
  return (
    <article className="group flex flex-col">
      <NextLink href={href} className="interaction-focus block overflow-hidden rounded-sm">
        <div className="relative aspect-[3/4] w-full overflow-hidden sm:aspect-[4/5]">
          <ResponsiveImage
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_oklch,var(--background)_15%,transparent)_0%,transparent_45%)]"
          />
        </div>
      </NextLink>

      <Stack gap="md" className="pt-(--space-lg)">
        <Stack gap="xs">
          <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
            {title}
          </h3>
          <Text size="sm" tone="muted" className="max-w-prose leading-relaxed">
            {description}
          </Text>
        </Stack>

        <NextLink href={href} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          {cta}
          <ArrowRight aria-hidden className="size-4" />
        </NextLink>
      </Stack>
    </article>
  );
}

export function ProgramsCards() {
  return (
    <Section
      id="pathways"
      spacing="xl"
      className="border-border border-t"
      aria-labelledby="programs-cards-heading"
    >
      <Container size="xl">
        <h2
          id="programs-cards-heading"
          className="text-muted-foreground mb-(--space-3xl) text-xs font-normal tracking-[0.15em] uppercase"
        >
          Three pathways
        </h2>

        <div className="grid grid-cols-1 gap-(--space-3xl) md:grid-cols-3 md:gap-(--space-xl)">
          {navigation.map((program) => (
            <DestinationCard key={program.id} {...program} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
