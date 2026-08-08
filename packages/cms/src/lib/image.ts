import createImageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { dataset, projectId } from '../env';

const builder = createImageUrlBuilder({ projectId: projectId || 'placeholder', dataset });

/** Build a Sanity CDN image URL from an image reference. */
export function urlForImage(source: SanityImageSource) {
  return builder.image(source).auto('format').fit('max');
}
