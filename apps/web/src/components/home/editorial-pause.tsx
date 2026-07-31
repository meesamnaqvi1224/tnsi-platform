import { Container } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';
import { ResponsiveImage } from '@/components/utility/responsive-image';

/**
 * The editorial pause after the hero — exists purely for rhythm, not
 * information. One sentence over a quiet, atmospheric photograph. No
 * button, no decoration. `dark` flips the semantic tokens locally
 * (Deep Slate / cream), the same pattern `MethodPanel` uses, so the
 * overlaid text stays token-driven rather than a hardcoded white.
 */
export function EditorialPause() {
  return (
    <FadeIn as="section" aria-label="Editorial statement" className="relative overflow-hidden">
      <ResponsiveImage
        src="/images/resources/hero.webp"
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/55" aria-hidden />

      <div className="dark text-foreground relative flex min-h-[70vh] items-center justify-center px-(--space-xl) py-(--space-4xl) sm:px-(--space-3xl)">
        <Container size="xl">
          <p className="font-heading mx-auto max-w-3xl text-center text-4xl leading-[1.1] font-semibold tracking-tight text-balance lg:text-5xl xl:text-[3.5rem]">
            The goal isn&apos;t to eliminate stress. It&apos;s to expand your capacity to meet life
            differently.
          </p>
        </Container>
      </div>
    </FadeIn>
  );
}
