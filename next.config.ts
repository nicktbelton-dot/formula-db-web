import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // the site is built as plain static files
  images: { unoptimized: true },
  serverExternalPackages: ['sql.js'], // the build reads the database with sql.js in Node
};

export default nextConfig;
