import NextLink from 'next/link';
import { buttonVariants, cn, Container, Eyebrow, Section, Stack, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { FadeIn } from '@/components/utility/fade-in';
import { homeImages } from '@/content/images';

export function Hero() {
  return (
    <Section
      spacing="xl"
      className="pt-(--space-3xl) pb-(--space-3xl) sm:pt-(--space-4xl) sm:pb-(--space-4xl)"
      aria-labelledby="hero-heading"
    >
      <Container size="xl">
        <div className="grid grid-cols-1 items-center gap-(--space-2xl) lg:grid-cols-[48fr_52fr] lg:gap-(--space-3xl)">
          <Stack gap="lg" className="max-w-xl">
            <FadeIn>
              <Eyebrow>Nervous System Education</Eyebrow>
            </FadeIn>

            <FadeIn delayMs={80}>
              <h1
                id="hero-heading"
                className="font-heading text-foreground text-[2.75rem] leading-[1.03] font-semibold tracking-tight sm:text-6xl lg:text-[4.5rem] xl:text-[5rem]"
              >
                Success shouldn&apos;t cost your nervous system.
              </h1>
            </FadeIn>

            <FadeIn delayMs={160}>
              <Text size="lg" tone="muted" className="max-w-prose leading-relaxed">
                Evidence-informed education for ambitious women, leaders and practitioners who want
                sustainable success without sacrificing their wellbeing.
              </Text>
            </FadeIn>

            <FadeIn delayMs={220}>
              <Stack gap="lg">
                <Stack direction="row" gap="sm" wrap="wrap">
                  <NextLink
                    href="/about"
                    className={buttonVariants({ variant: 'primary', size: 'lg' })}
                  >
                    Explore the Institute
                  </NextLink>
                  <NextLink
                    href="/book-a-call"
                    className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'bg-card')}
                  >
                    Book a Discovery Call
                  </NextLink>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Not sure where to start?
                  </Text>
                  <div>
                    <NextLink
                      href="/assessment"
                      className={buttonVariants({ variant: 'primary', size: 'lg' })}
                    >
                      Take the 2-minute Capacity Assessment
                    </NextLink>
                  </div>
                </Stack>
              </Stack>
            </FadeIn>
          </Stack>

          <FadeIn delayMs={120}>
            <EditorialImage
              src={homeImages.heroPortrait}
              alt="Caroline Reed, Founder and Director of The Nervous System Institute, in a professional portrait with warm natural light."
              aspect="portrait"
              className="rounded-lg"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </FadeIn>
        </div>
      </Container>
    </Section>
  );
}
