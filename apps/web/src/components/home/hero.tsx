import NextLink from 'next/link';
import { buttonVariants, cn, Container, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { homeImages } from '@/content/images';

export function Hero() {
  return (
    <Section
      spacing="xl"
      className="pt-(--space-4xl) pb-(--space-4xl) sm:pt-(--space-5xl) sm:pb-(--space-5xl)"
      aria-labelledby="hero-heading"
    >
      <Container size="xl">
        <div className="grid grid-cols-1 items-center gap-(--space-2xl) lg:grid-cols-5 lg:gap-(--space-3xl)">
          <Stack gap="lg" className="lg:col-span-3">
            <Eyebrow>Nervous System Education</Eyebrow>
            <Heading as="h1" id="hero-heading" size="2xl" className="text-4xl sm:text-5xl">
              Success shouldn&apos;t cost your nervous system.
            </Heading>
            <Text size="lg" tone="muted" className="max-w-prose">
              Evidence-informed education for ambitious women, leaders and practitioners who want
              sustainable success without sacrificing their wellbeing.
            </Text>
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
            <Text size="sm" tone="muted">
              Not sure where to start?{' '}
              <NextLink href="/assessment" className="interaction-text-link-underline font-medium">
                Take the 2-minute Capacity Assessment
              </NextLink>
            </Text>
          </Stack>

          <EditorialImage
            src={homeImages.heroPortrait}
            alt="Caroline Reed, Founder and Director of The Nervous System Institute, in a professional portrait with warm natural light."
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
