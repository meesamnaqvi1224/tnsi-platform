import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      {
        source: '/placeholders/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/privacy-policy',
        destination: '/privacy',
        permanent: true,
      },
      {
        source: '/terms-of-use',
        destination: '/terms',
        permanent: true,
      },
      {
        source: '/programs/life-beyond-trauma',
        destination: '/method',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
