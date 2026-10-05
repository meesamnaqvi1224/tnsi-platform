import { Container } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { ImageReveal } from '@/components/utility/image-reveal';
import { ResponsiveImage } from '@/components/utility/responsive-image';

/**
 * The thesis of the page, as a full-width cinematic chapter: the existing
 * conversation photograph at 70–80vh, settling slowly as it enters, with the
 * existing statement over it. Flat dark scrim (no gradient). Same `dark`
 * token-scope pattern as the homepage's editorial pause — text stays
 * token-driven, not a hardcoded white.
 */
export function MethodQuote() {
  return (
    <section
      aria-label="Editorial statement"
      data-chapter
      data-tone="dark"
      className="relative overflow-hidden"
    >
      <ImageReveal>
        <ResponsiveImage
          src="/images/discovery/hero-landscape.webp"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
      </ImageReveal>
      <div className="absolute inset-0 bg-black/55" aria-hidden />

      <div className="dark text-foreground relative flex min-h-[70vh] items-end pt-(--space-5xl) pb-(--space-3xl) sm:pb-(--space-4xl) lg:min-h-[80vh]">
        <Container size="xl">
          <FadeIn>
            <p className="font-heading max-w-4xl text-[clamp(2.25rem,5.2vw,4.5rem)] leading-[1.1] font-semibold tracking-tight">
              Healing doesn&apos;t begin when you think differently.
              <br />
              It begins when your nervous system experiences safety.
            </p>
          </FadeIn>
        </Container>
      </div>
    </section>
  );
}
