import type { NextConfig } from "next";

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001'

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBaseUrl}/api/v1/:path*`,
      },
    ]
  },
};

export default nextConfig;
