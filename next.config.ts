import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable PWA support
  experimental: {
    // Ensure service worker is properly handled
  },

  // Prevent HTTP caching of sw.js and manifest so browsers always
  // fetch the latest versions when checking for SW updates.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
        ],
      },
    ];
  },
};

export default nextConfig;
