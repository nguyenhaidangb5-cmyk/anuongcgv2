import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'admin.anuongcangiuoc.org',
        pathname: '/**',
      },
      // --- THÊM ĐOẠN NÀY ---
      {
        protocol: 'http',  // Cho phép cả HTTP thường
        hostname: 'admin.anuongcangiuoc.org',
        pathname: '/**',
      },
      // --------------------
      {
        protocol: 'https',
        hostname: 'anuongcangiuoc.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'secure.gravatar.com',
      },
      {
        protocol: 'https',
        hostname: '0.gravatar.com',
      },
    ],
    dangerouslyAllowSVG: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;