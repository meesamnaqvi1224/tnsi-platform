import { TypographicMoment } from '@tnsi/ui';
import { FadeIn } from '@/components/utility/fade-in';

/**
 * The editorial pause after the hero — exists purely for rhythm, not
 * information. See `TypographicMoment` in `@tnsi/ui`: one sentence, one
 * viewport of whitespace, no button, no decoration.
 */
export function EditorialPause() {
  return (
    <FadeIn as="section" aria-label="Editorial statement">
      <TypographicMoment align="center">
        The goal isn&apos;t to eliminate stress. It&apos;s to expand your capacity to meet life
        differently.
      </TypographicMoment>
    </FadeIn>
  );
}
