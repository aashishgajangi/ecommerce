import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Client-side router cache: don't hold static segments for more than 30s
    // so layout changes (notice banner etc.) propagate without manual cache clear
    staleTimes: {
      static: 30,
      dynamic: 0,
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'minio.hangoutcakes.com' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9000' },
    ],
  },
}

export default nextConfig
