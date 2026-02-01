import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'admin.anuongcangiuoc.org', // Nơi chứa ảnh gốc
      },
      {
        protocol: 'https',
        hostname: 'anuongcangiuoc.org', // Dự phòng
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
    ignoreBuildErrors: true, // Bỏ qua lỗi check type để ưu tiên chạy
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;