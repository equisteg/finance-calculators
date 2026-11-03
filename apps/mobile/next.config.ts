import type { NextConfig } from 'next';

// Static export loaded by Capacitor from webDir "out" (capacitor.config.ts).
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['@finealth/finance-core', '@finealth/shared-types'],
};

export default nextConfig;
