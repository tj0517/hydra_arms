import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'hurt.sharg.pl',
      },
      {
        protocol: 'https',
        hostname: '*.baselinker.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.baselinker.com',
      },
    ],
  },
};

export default nextConfig;
