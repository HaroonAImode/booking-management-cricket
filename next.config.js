/** @type {import('next').NextConfig} */
const nextConfig = {
    productionBrowserSourceMaps: true,
  // Configure to allow images from external domains if needed
  images: {
    remotePatterns: [],
  },
  // Enable experimental features if needed
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
  // Disable TypeScript checks during build (for deployment)
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
