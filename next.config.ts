import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // the site is built as plain static files
  images: { unoptimized: true },
};

export default nextConfig;
