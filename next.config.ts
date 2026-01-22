import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable PWA support
  experimental: {
    // Ensure service worker is properly handled
  },
};

export default nextConfig;
