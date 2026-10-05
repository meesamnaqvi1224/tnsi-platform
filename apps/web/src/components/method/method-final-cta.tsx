import NextLink from 'next/link';
import { buttonVariants, Container, Stack, Text } from '@tnsi/ui';
import { MethodChapterHeading } from '@/components/method/method-chapter-heading';
import { FadeIn } from '@/components/utility/fade-in';
import { ImageReveal } from '@/components/utility/image-reveal';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { aboutImages } from '@/content/images';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { finalCta } = humanExpansionTheoryContent;

/**
 * The destination: the existing CTA copy at display scale on the left, and an
 * existing photograph of the Institute's consultation room bleeding off the
 * right edge. On mobile the photograph sits below the copy.
 */
export function MethodFinalCta() {
  return (
    <section
      data-chapter
      className="bg-secondary relative overflow-hidden lg:min-h-[36rem]"
      aria-labelledby="method-final-cta-heading"
    >
      <Container size="xl" className="relative z-10">
        <div className="py-(--space-4xl) sm:py-(--space-5xl) lg:w-[52%] lg:pr-(--space-2xl)">
          <FadeIn>
            <Stack gap="lg">
              <MethodChapterHeading
                id="method-final-cta-heading"
                title={finalCta.heading}
                size="major"
              />
              <Text className="text-foreground/75 max-w-[46ch] text-lg leading-[1.7] sm:text-xl">
                {finalCta.supportingCopy}
              </Text>
              <div className="pt-(--space-sm)">
                <NextLink
                  href={finalCta.cta.href}
                  className={buttonVariants({ variant: 'primary', size: 'lg' })}
                >
                  {finalCta.cta.label}
                </NextLink>
              </div>
              <Text size="sm" className="text-foreground/75">
                Or start lighter —{' '}
                <NextLink
                  href="/assessment"
                  className="interaction-text-link-underline font-medium"
                >
                  take the Capacity Assessment
                </NextLink>
              </Text>
            </Stack>
          </FadeIn>
        </div>
      </Container>

      <div className="relative aspect-[4/3] w-full overflow-hidden lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[44%]">
        <ImageReveal>
          <ResponsiveImage
            src={aboutImages.missionEditorial}
            alt="A warm consultation room with two soft armchairs facing each other, lit by natural light from tall garden windows."
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 44vw"
          />
        </ImageReveal>
      </div>
    </section>
  );
}
