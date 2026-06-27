import NextLink from 'next/link';
import { buttonVariants, Eyebrow, Stack, Text } from '@tnsi/ui';

export function ProgramsHero() {
  return (
    <section
      aria-labelledby="programs-hero-heading"
      className="grid min-h-screen grid-cols-1 lg:grid-cols-[45fr_55fr]"
    >
      {/* Left — Deep Slate editorial panel, text anchored to bottom */}
      <div className="dark bg-background text-foreground flex flex-col justify-end px-(--space-xl) pt-(--space-5xl) pb-(--space-4xl) sm:px-(--space-3xl) lg:px-(--space-3xl)">
        <Stack gap="xl" className="max-w-lg">
          <div>
            <div className="border-border mb-(--space-md) w-10 border-t-2" />
            <Eyebrow className="text-muted-foreground">Programs</Eyebrow>
          </div>

          <h1
            id="programs-hero-heading"
            className="font-heading text-foreground text-5xl leading-[1.03] font-semibold tracking-tight lg:text-[4rem] xl:text-[5rem]"
          >
            Every transformation
            <br />
            begins with the right
            <br />
            pathway.
          </h1>

          <Stack gap="lg">
            <Text size="lg" tone="muted" className="max-w-[22rem]">
              Whether you&apos;re seeking personal healing, professional development or practitioner
              training, our programs are designed to help you build lasting nervous system capacity
              through evidence-informed education.
            </Text>
            <Stack direction="row" gap="sm" wrap="wrap">
              <NextLink
                href="/programs/life-beyond-trauma"
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                Explore Life Beyond Trauma
              </NextLink>
              <NextLink
                href="/book-a-call"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Book a Discovery Call
              </NextLink>
            </Stack>
          </Stack>
        </Stack>
      </div>

      {/* Right — image, full height, bleeds to viewport edge */}
      {/* TODO: swap for approved editorial portrait once added to apps/web/public */}
      <div className="bg-secondary relative hidden lg:block">
        <div className="absolute inset-0 flex items-end justify-start p-(--space-lg)">
          <Text size="sm" tone="muted">
            Editorial portrait placeholder
          </Text>
        </div>
      </div>
    </section>
  );
}
