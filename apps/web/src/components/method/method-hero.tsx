import NextLink from 'next/link';
import { buttonVariants, Eyebrow, Stack, Text } from '@tnsi/ui';
import { SectionImage } from '@/components/utility/section-image';
import { methodImages } from '@/content/images';

export function MethodHero() {
  return (
    <section
      aria-labelledby="method-hero-heading"
      className="grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-[45fr_55fr]"
    >
      <div className="dark bg-background text-foreground flex flex-col justify-end px-(--space-xl) pt-(--space-5xl) pb-(--space-4xl) sm:px-(--space-3xl) lg:px-(--space-3xl)">
        <Stack gap="xl" className="max-w-lg">
          <div>
            <div className="border-border mb-(--space-md) w-10 border-t-2" />
            <Eyebrow className="text-muted-foreground">The Method</Eyebrow>
          </div>

          <h1
            id="method-hero-heading"
            className="font-heading text-foreground text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl lg:text-[4.5rem] xl:text-[5.5rem]"
          >
            Life Beyond
            <br />
            Trauma.
          </h1>

          <Stack gap="lg">
            <Text size="lg" tone="muted" className="max-w-[18rem]">
              Not a technique for managing symptoms. A different physiological foundation — built at
              the level where patterns actually live.
            </Text>
            <div>
              <NextLink
                href="#method-foundation"
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                Explore the Method
              </NextLink>
            </div>
          </Stack>
        </Stack>
      </div>

      <div className="bg-secondary relative hidden lg:block">
        <SectionImage
          src={methodImages.heroPortrait}
          alt="Caroline Reed in a warm editorial portrait for the Life Beyond Trauma method."
          priority
          sizes="55vw"
        />
      </div>
    </section>
  );
}
