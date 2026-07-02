import { ResponsiveImage } from '@/components/utility/responsive-image';
import NextLink from 'next/link';
import { buttonVariants, Container, Stack } from '@tnsi/ui';
import { contactContent } from '@/content/contact';

const { hero } = contactContent;

export function ContactHero() {
  return (
    <section aria-labelledby="contact-hero-heading" className="border-border border-b">
      <div className="relative min-h-[48vh] w-full overflow-hidden lg:min-h-[56vh]">
        <ResponsiveImage
          src={hero.imageSrc}
          alt={hero.imageAlt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_oklch,var(--background)_92%,transparent)_0%,transparent_55%)]"
        />
      </div>

      <Container
        size="xl"
        className="px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl) lg:py-(--space-5xl)"
      >
        <Stack gap="2xl" className="max-w-3xl">
          <div className="flex flex-col gap-(--space-sm)">
            <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
              Chapter {hero.chapter}
            </span>
            <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
              {hero.eyebrow}
            </p>
          </div>

          <h1
            id="contact-hero-heading"
            className="font-heading text-foreground text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl lg:text-[4.5rem] xl:text-[5.5rem]"
          >
            {hero.headline}
          </h1>

          <p className="text-foreground max-w-2xl text-lg leading-snug font-medium sm:text-xl lg:text-2xl">
            {hero.supportingHeadline}
          </p>

          <Stack direction="row" gap="sm" wrap="wrap">
            <NextLink
              href={hero.primaryCta.href}
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              {hero.primaryCta.label}
            </NextLink>
            <NextLink href={hero.secondaryCta.href} className="interaction-text-link-underline">
              {hero.secondaryCta.label}
            </NextLink>
          </Stack>
        </Stack>
      </Container>
    </section>
  );
}
