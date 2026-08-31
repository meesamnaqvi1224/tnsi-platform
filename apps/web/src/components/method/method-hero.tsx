import NextLink from 'next/link';
import { buttonVariants, Eyebrow, Stack, Text } from '@tnsi/ui';
import { SectionImage } from '@/components/utility/section-image';
import { methodImages } from '@/content/images';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { hero } = humanExpansionTheoryContent;

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
            <Eyebrow className="text-muted-foreground">{hero.eyebrow}</Eyebrow>
          </div>

          <h1
            id="method-hero-heading"
            className="font-heading text-foreground text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl lg:text-[4.5rem] xl:text-[5.5rem]"
          >
            {hero.headline}
          </h1>

          <Stack gap="lg">
            <Text size="lg" tone="muted" className="max-w-[22rem]">
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
        </Stack>
      </div>

      <div className="bg-secondary relative hidden lg:block">
        <SectionImage
          src={methodImages.heroPortrait}
          alt="Caroline Reed in a warm editorial portrait for The Nervous System Institute."
          priority
          sizes="55vw"
        />
      </div>
    </section>
  );
}
