/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // External packages for serverless functions (correct property name)
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
    // Ensure proper file tracing for Chromium binaries
    outputFileTracingIncludes: {
      '/api/generate-pdf-puppeteer-remote': ['./node_modules/@sparticuz/chromium-min/**/*'],
    },
  },
};

module.exports = nextConfig;