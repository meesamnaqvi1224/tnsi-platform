import Image from 'next/image';
import NextLink from 'next/link';
import { buttonVariants, Container, Stack, Text } from '@tnsi/ui';
import { facultyContent } from '@/content/faculty';

const { hero } = facultyContent;

export function FacultyHero() {
  return (
    <section aria-labelledby="faculty-hero-heading" className="border-border border-b">
      <div className="grid min-w-0 grid-cols-1 overflow-hidden lg:grid-cols-[0.45fr_0.55fr]">
        <div className="relative min-h-[50vh] overflow-hidden lg:min-h-[78vh]">
          <Image
            src={hero.imageSrc}
            alt={hero.imageAlt}
            fill
            priority
            unoptimized
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 45vw"
          />
          <p className="text-muted-foreground absolute inset-x-0 bottom-6 text-center text-xs tracking-[0.12em] uppercase lg:pl-8 lg:text-left">
            Portrait placeholder — editorial, natural light
          </p>
        </div>

        <Container
          size="xl"
          className="flex items-center px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl) lg:py-0"
        >
          <Stack gap="2xl" className="max-w-xl">
            <div className="flex flex-col gap-(--space-sm)">
              <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
                Chapter {hero.chapter}
              </span>
              <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
                {hero.eyebrow}
              </p>
            </div>

            <h1
              id="faculty-hero-heading"
              className="font-heading text-foreground text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl lg:text-[4.5rem] xl:text-[5.5rem]"
            >
              {hero.headline}
            </h1>

            <Stack gap="lg">
              <p className="text-foreground max-w-2xl text-lg leading-snug font-medium sm:text-xl lg:text-2xl">
                {hero.supportingHeadline}
              </p>
              <Text tone="muted" className="max-w-prose leading-relaxed">
                {hero.supportingCopy}
              </Text>
            </Stack>

            <Stack direction="row" gap="sm" wrap="wrap">
              <NextLink
                href={hero.primaryCta.href}
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                {hero.primaryCta.label}
              </NextLink>
              <NextLink
                href={hero.secondaryCta.href}
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                {hero.secondaryCta.label}
              </NextLink>
            </Stack>
          </Stack>
        </Container>
      </div>
    </section>
  );
}
