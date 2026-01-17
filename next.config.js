/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure to allow images from external domains if needed
  images: {
    remotePatterns: [],
  },
  // Enable experimental features if needed
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
}

module.exports = nextConfig
