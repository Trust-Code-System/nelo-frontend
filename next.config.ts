import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root: an unrelated package-lock.json in the user's home
  // directory otherwise makes Turbopack infer the wrong root.
  turbopack: { root: path.resolve(process.cwd()) },
  // Never ship with checks disabled — the delivery gate forbids it.
  // (Next 16 moved lint config out of next.config; lint runs as its own CI step.)
  typescript: { ignoreBuildErrors: false },
  images: {
    // Vendure asset server only. The Shopify CDN is deliberately NOT allowed: this
    // storefront must not depend on the platform it is replacing.
    remotePatterns: [
      // Local development harness (../vendure-dev).
      { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/assets/**' },
      // Deployed Vendure asset host. Set VENDURE_ASSET_HOST in each environment.
      ...(process.env.VENDURE_ASSET_HOST
        ? [
            {
              protocol: 'https' as const,
              hostname: process.env.VENDURE_ASSET_HOST,
              pathname: '/assets/**',
            },
          ]
        : []),
    ],
    // Next 16's optimizer refuses to fetch from another localhost port, so local
    // development serves Vendure previews unoptimized. Production optimizes normally
    // against the real asset host above — this is a harness limitation, not a policy.
    unoptimized: process.env.NODE_ENV === 'development',
  },
  async rewrites() {
    // Browsers request /favicon.ico before reading the app icon link. The artwork lives
    // at app/icon.png, which Next serves as /icon.png.
    return {
      beforeFiles: [{ source: '/favicon.ico', destination: '/icon.png' }],
    };
  },
};

export default config;
