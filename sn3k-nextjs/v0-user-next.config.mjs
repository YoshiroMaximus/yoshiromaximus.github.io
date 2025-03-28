/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Enable static exports for GitHub Pages
  images: {
    unoptimized: true, // Required for static export
    domains: ['sn4k.me'], // Add domains for external images
  },
  // Disable server components for static export
  experimental: {
    appDir: true,
  },
  // Add trailing slash for GitHub Pages compatibility
  trailingSlash: true,
};

export default nextConfig;

