/** @type {import('next').NextConfig} */
const nextConfig = {
  // External packages for serverless functions
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
  
  experimental: {
    // Ensure proper file tracing for Chromium binaries
    outputFileTracingIncludes: {
      '/api/generate-pdf-puppeteer-remote': ['./node_modules/@sparticuz/chromium-min/**/*'],
    },
  },
};

module.exports = nextConfig;