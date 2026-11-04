/**
 * Sizing rules for standalone PowerDrop™ artwork. Pure (no React Native), so
 * it can be unit-tested with the rest of the mobile logic.
 *
 * The artwork is shown whole: its own aspect ratio is read from the image
 * (never assumed), the box takes that ratio, and the image is drawn with
 * `contain`. A cap on height keeps one visual from outgrowing the screen
 * without ever cropping or stretching it.
 */

/** Ratios outside this range are treated as unreadable metadata, not artwork. */
const MIN_RATIO = 0.2;
const MAX_RATIO = 5;

/** width ÷ height of the real image, or `null` when the size is not usable. */
export function artworkAspectRatio(width: number, height: number): number | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const ratio = width / height;
  return ratio >= MIN_RATIO && ratio <= MAX_RATIO ? ratio : null;
}

/** Share of the window height one artwork may take. */
const HEIGHT_SHARE = 0.72;
/** Never smaller than this, so very short windows still show a usable visual. */
const MIN_MAX_HEIGHT = 360;

export function artworkMaxHeight(windowHeight: number): number {
  const height = Number.isFinite(windowHeight) && windowHeight > 0 ? windowHeight : 0;
  return Math.max(MIN_MAX_HEIGHT, Math.round(height * HEIGHT_SHARE));
}

/**
 * The size an artwork is actually drawn at inside a column of `availableWidth`:
 * as wide as allowed, but no wider than `maxWidth` and no taller than
 * `maxHeight` — always at its own ratio, so nothing is cropped or distorted.
 */
export function fitArtwork(
  ratio: number,
  availableWidth: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const width = Math.min(availableWidth, maxWidth, maxHeight * ratio);
  return { width, height: width / ratio };
}
