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
    // Vendure asset server. Add the real host before phase 2; the Shopify CDN entry is
    // only here so the phase 0 mockup imagery resolves during early development.
    remotePatterns: [
      { protocol: 'https', hostname: 'www.nelowoman.com', pathname: '/cdn/shop/**' },
    ],
  },
};

export default config;
