import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'minio.hangoutcakes.com' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9000' },
    ],
  },
}

export default nextConfig
