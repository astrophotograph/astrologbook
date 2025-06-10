import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [new URL('https://m.astrophotography.tv/i/**')],
  },
  assetPrefix: '/ph',
  experimental: {
    serverActions: {
      allowedOrigins: ['astroroot.vercel.app', 'photohosting.vercel.app', 'astrophotography.tv', 'www.astrophotography.tv'],
    },
  },
};

export default nextConfig;
