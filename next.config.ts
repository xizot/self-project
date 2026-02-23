import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { hostname: 'i.ytimg.com' },
      { hostname: 'img.youtube.com' },
      { hostname: 'i.tiktokcdn.com' },
      { hostname: 'p16-sign-va.tiktokcdn.com' },
      { hostname: 'p16-sign.tiktokcdn.com' },
      { hostname: '*.fbcdn.net' },
      { hostname: '*.cdninstagram.com' },
    ],
  },
};

export default nextConfig;
