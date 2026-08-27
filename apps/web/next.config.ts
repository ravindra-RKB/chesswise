import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@chesswise/shared-types', '@chesswise/database'],
};

export default nextConfig;
