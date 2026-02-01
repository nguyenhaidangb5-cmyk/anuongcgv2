/** @type {import('next').NextConfig} */
const nextConfig = {
  // TẮT TỐI ƯU HÓA: Chìa khóa để hiện ảnh ở tất cả mọi nơi (Top 5, List, Chi tiết...)
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'admin.anuongcangiuoc.org',
        pathname: '/**',
      },
    ],
  },
  // Bỏ qua lỗi build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;