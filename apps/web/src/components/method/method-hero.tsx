import NextLink from 'next/link';
import { buttonVariants, Container, Eyebrow, Section, Stack, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { methodImages } from '@/content/images';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { hero } = humanExpansionTheoryContent;

export function MethodHero() {
  return (
    <Section
      spacing="xl"
      className="pt-(--space-4xl) pb-(--space-4xl) sm:pt-(--space-5xl) sm:pb-(--space-5xl)"
      aria-labelledby="method-hero-heading"
    >
      <Container size="xl">
        <div className="grid grid-cols-1 items-center gap-(--space-2xl) lg:grid-cols-5 lg:gap-(--space-3xl)">
          <Stack gap="lg" className="lg:col-span-3">
            <Eyebrow>{hero.eyebrow}</Eyebrow>

            <h1
              id="method-hero-heading"
              className="font-heading text-foreground text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl"
            >
              {hero.headline}
            </h1>

            <Text size="lg" tone="muted" className="max-w-prose">
              {hero.tagline}
            </Text>

            <div>
              <NextLink
                href={hero.cta.href}
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                {hero.cta.label}
              </NextLink>
            </div>
          </Stack>

          <EditorialImage
            src={methodImages.heroPortrait}
            alt="A sunlit study corner with a desk, chair and a large monstera plant beside a window, warm afternoon light on the wood floor."
            aspect="portrait"
            className="rounded-lg lg:col-span-2"
            priority
            sizes="(max-width: 1024px) 100vw, 40vw"
          />
        </div>
      </Container>
    </Section>
  );
}
