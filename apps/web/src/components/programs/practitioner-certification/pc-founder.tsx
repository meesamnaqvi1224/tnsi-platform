import NextLink from 'next/link';
import { buttonVariants, ChapterMarker, Stack, Text } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { founder } = practitionerCertificationContent;

export function PcFounder() {
  return (
    <section
      aria-labelledby="pc-founder-heading"
      className="border-foreground/15 grid grid-cols-1 border-t lg:grid-cols-[48fr_52fr]"
    >
      <figure className="border-foreground/15 bg-secondary relative aspect-[4/5] w-full overflow-hidden border-b lg:aspect-auto lg:border-r lg:border-b-0">
        <ResponsiveImage
          src={founder.imageSrc}
          alt={founder.imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 48vw"
        />
      </figure>

      <div className="flex items-center px-(--space-lg) py-(--space-3xl) sm:px-(--space-2xl) lg:px-(--space-3xl)">
        <FadeIn>
          <Stack gap="xl" className="max-w-lg">
            <ChapterMarker
              index={founder.chapter}
              as="h2"
              size="2xl"
              headingId="pc-founder-heading"
              title={founder.heading}
            />

            <Stack gap="md">
              {founder.paragraphs.map((paragraph) => (
                <Text key={paragraph} tone="muted" size="lg" className="leading-[1.7]">
                  {paragraph}
                </Text>
              ))}
            </Stack>

            <div>
              <NextLink
                href={founder.cta.href}
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                {founder.cta.label}
              </NextLink>
            </div>
          </Stack>
        </FadeIn>
      </div>
    </section>
  );
}
