import type { MetadataRoute } from 'next';
import { DEFAULT_DESCRIPTION, SITE_NAME, absoluteUrl } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'TNSI',
    description: DEFAULT_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F4EF',
    theme_color: '#2B2B2B',
    lang: 'en-GB',
    icons: [
      {
        src: absoluteUrl('/favicon.ico'),
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
