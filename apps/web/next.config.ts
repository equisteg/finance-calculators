import type { NextConfig } from 'next';

// Static export: `out/` is served by the Cloudflare Worker's static assets (apps/api, security headers in public/_headers).
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@finealth/finance-core', '@finealth/shared-types'],
};

export default nextConfig;
