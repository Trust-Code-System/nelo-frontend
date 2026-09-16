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
    // storefront must not depend on the platform it is replacing. Mockup imagery is served
    // from design/mockups/assets, and product imagery will come from Vendure.
    remotePatterns: [],
  },
};

export default config;
