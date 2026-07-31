import { Container } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';

/**
 * The thesis of the page, over a quiet photograph rather than blank space.
 * Same `dark` token-scope pattern as the homepage's editorial pause /
 * "What Changes" sections — text stays token-driven, not a hardcoded white.
 */
export function MethodQuote() {
  return (
    <section aria-label="Editorial statement" className="relative overflow-hidden">
      <ResponsiveImage
        src="/images/discovery/hero-landscape.webp"
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/55" aria-hidden />

      <div className="dark text-foreground relative flex min-h-[70vh] items-center px-(--space-xl) py-(--space-4xl) sm:px-(--space-3xl)">
        <Container size="xl">
          <p className="font-heading max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight lg:text-5xl xl:text-[3.5rem]">
            Healing doesn&apos;t begin when you think differently.
            <br />
            It begins when your nervous system experiences safety.
          </p>
        </Container>
      </div>
    </section>
  );
}
