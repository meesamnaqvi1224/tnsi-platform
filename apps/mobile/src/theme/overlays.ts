/**
 * The one scrim treatment for text-over-photo components (Continue, Quick
 * Practice, Explore, the Home closing statement). Previously each of
 * these picked its own flat `rgba(...)` tint independently (30%/32%/45%),
 * which read as arbitrary rather than a considered system, and a flat
 * tint either muddies a photo's lighter areas or under-darkens them
 * depending on the image - neither guarantees the text sitting on it
 * stays readable.
 *
 * A bottom-weighted gradient (transparent at the top, near-opaque at the
 * bottom) solves both: the image reads clearly where there's no text, and
 * contrast is strong exactly where the text sits, regardless of how light
 * or dark that particular photo is. Reuses the same three-stop shape and
 * color already established by WelcomeHeader's own gradient, rather than
 * inventing a second pattern.
 *
 * Use with `expo-linear-gradient`'s `<LinearGradient colors={imageOverlayGradient} style={StyleSheet.absoluteFill} />`
 * positioned behind the overlaid text, in place of a flat-color `View`.
 */
export const imageOverlayGradient = [
  'rgba(11,21,38,0.05)',
  'rgba(11,21,38,0.45)',
  'rgba(11,21,38,0.88)',
] as const;
