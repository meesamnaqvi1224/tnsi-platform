import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
