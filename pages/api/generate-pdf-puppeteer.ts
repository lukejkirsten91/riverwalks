import { NextApiRequest, NextApiResponse } from 'next';
import chromium from '@sparticuz/chromium-min';
import puppeteerCore from 'puppeteer-core';
import { Mutex } from 'async-mutex';

export const dynamic = 'force-dynamic';

// Using @sparticuz/chromium-min for optimal bundle size (~26MB vs ~170MB)

// Mutex to prevent concurrent browser access
const lock = new Mutex();

// Use globalThis to avoid "target closed" errors when Vercel re-uses Lambda
async function getBrowser() {
  const global = globalThis as any; // TypeScript workaround for dynamic property
  
  // Enhanced browser health check with safe process access
  const killed = typeof global.browser?.process === 'function' && global.browser.process()?.killed;
  if (global.browser && (!global.browser.isConnected?.() || killed)) {
    console.log('🔄 Resetting stale browser instance');
    global.browser = null; // Reset if browser is closed or process killed
  }
  
  if (global.browser) return global.browser;

  // Check if we're in production (Vercel) - using multiple environment checks
  const isProduction = process.env.NEXT_PUBLIC_VERCEL_ENVIRONMENT === 'production' || 
                      process.env.VERCEL_ENV === 'production' || 
                      process.env.NODE_ENV === 'production';
  
  console.log('🔍 Environment check:', {
    NEXT_PUBLIC_VERCEL_ENVIRONMENT: process.env.NEXT_PUBLIC_VERCEL_ENVIRONMENT,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    isProduction
  });
  
  if (isProduction) {
    console.log('🌐 Launching browser for production (Vercel)...');
    
    // Primary approach: use Puppeteer with Chromium-min binary
    try {
      const execPath = await chromium.executablePath();
      console.log('🧭 Chromium executable:', execPath);
      
      global.browser = await puppeteerCore.launch({
        args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage'],
        executablePath: execPath, // Use bundled binary that matches Puppeteer version
        headless: (process.env.CHROME_HEADLESS_MODE === 'new' ? 'new' : true) as any, // Use headless mode for PDF generation
      });
    } catch (chromiumError) {
      console.log('⚠️ Chromium launch failed:', chromiumError);
      console.log('🔄 Trying binary recovery...');
      
      // Fallback: try without custom arguments
      try {
        global.browser = await puppeteerCore.launch({
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
          executablePath: await chromium.executablePath(),
          headless: (process.env.CHROME_HEADLESS_MODE === 'new' ? 'new' : true) as any,
        });
      } catch (recoveryError) {
        console.log('⚠️ Binary recovery failed:', recoveryError);
        throw new Error('Failed to launch Chromium browser for PDF generation');
      }
    }
  } else {
    console.log('🖥️ Launching browser for local development...');
    
    // Better executable path handling for different platforms
    const getExecutablePath = () => {
      if (process.env.PUPPETEER_EXEC_PATH) {
        return process.env.PUPPETEER_EXEC_PATH;
      }
      
      switch (process.platform) {
        case 'darwin':
          return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        case 'linux':
          return '/usr/bin/google-chrome';
        case 'win32':
          return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        default:
          return undefined; // Fall back to system PATH
      }
    };
    
    global.browser = await puppeteerCore.launch({
      executablePath: getExecutablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: (process.env.CHROME_HEADLESS_MODE === 'new' ? 'new' : true) as any, // Use headless mode for PDF generation
    });
  }
  
  return global.browser;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Puppeteer PDF API called');
  console.log('📝 Request method:', req.method);
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('🏗️ Vercel environment:', process.env.VERCEL_ENV);

  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { riverWalkId, fileName } = req.body;
  console.log('🔍 Extracted riverWalkId:', riverWalkId);
  console.log('📄 Extracted fileName:', fileName);

  if (!riverWalkId) {
    console.log('❌ Missing riverWalkId');
    return res.status(400).json({ error: 'River walk ID is required' });
  }

  try {
    // Use mutex to prevent concurrent requests from racing on browser instance
    const pdfBuffer = await lock.runExclusive(async () => {
      console.log('🌐 Getting browser instance...');
      const browserInstance = await getBrowser();
      console.log('✅ Browser instance obtained');

      const page = await browserInstance.newPage();
      console.log('📄 New page created');

      // Set viewport with A4 paper ratio for better PDF rendering
      await page.setViewport({ width: 1240, height: 1754 });
      
      // Force screen media emulation for accurate CSS print rules
      await page.emulateMediaType('screen');

    // Navigate to the print-friendly page
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const printUrl = `${baseUrl}/print-report?id=${riverWalkId}`;
    
    console.log('🔗 Base URL:', baseUrl);
    console.log('🎯 Navigating to:', printUrl);
    
    const startTime = Date.now();
    const response = await page.goto(printUrl, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    const navigationTime = Date.now() - startTime;
    console.log(`✅ Page loaded in ${navigationTime}ms`);
    console.log('📄 Response status:', response?.status());
    console.log('📄 Response headers:', response?.headers());
    
    // Check if the page loaded successfully
    if (!response || response.status() !== 200) {
      throw new Error(`Failed to load print-report page. Status: ${response?.status()}`);
    }
    
    // Get page content to debug what's actually being rendered
    const pageTitle = await page.title();
    console.log('📋 Page title:', pageTitle);
    
    // Check for error content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('📝 Page content preview:', bodyText.substring(0, 200));
    console.log('📝 Full page content length:', bodyText.length);
    
    // Get HTML content for debugging
    const htmlContent = await page.evaluate(() => document.documentElement.outerHTML);
    console.log('🔍 HTML content length:', htmlContent.length);
    console.log('🔍 HTML preview:', htmlContent.substring(0, 500));
    
    if (bodyText.includes('404') || bodyText.includes('Not Found') || bodyText.includes('Error')) {
      throw new Error(`Print-report page returned error content: ${bodyText.substring(0, 500)}`);
    }
    
    // Check if page actually has content
    if (bodyText.length < 100) {
      throw new Error(`Print-report page has insufficient content. Body text: ${bodyText}`);
    }

    // Wait for content to fully render, especially charts
    console.log('⏳ Waiting for charts and content to render...');
    
    try {
      // Wait for report to be ready (will add this flag to print-report component)
      await page.waitForFunction(() => (window as any).__REPORT_READY === true, { timeout: 30000 });
      console.log('✅ Report ready flag detected');
    } catch (e) {
      console.log('⚠️ Report ready timeout, falling back to time-based wait');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Wait for any Plotly charts specifically
    try {
      await page.waitForSelector('.plotly-graph-div', { timeout: 10000 });
      console.log('📊 Plotly charts detected, waiting for full render...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (e) {
      console.log('ℹ️ No Plotly charts found or timeout reached');
    }

    console.log('🖨️ Starting PDF generation...');
    const pdfStartTime = Date.now();
    
    // Generate PDF with enhanced page break handling
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      // Remove tagged option for reliability on some Chromium builds
      outline: false,
    });
    
    const pdfGenerationTime = Date.now() - pdfStartTime;
    console.log(`✅ PDF generated in ${pdfGenerationTime}ms`);
    console.log('📊 PDF buffer size:', pdfBuffer.length, 'bytes');

      // Close the page but keep browser instance for reuse
      await page.close();
      console.log('✅ Page closed');
      
      return pdfBuffer;
    }); // End mutex block

    // Set response headers
    const finalFileName = fileName || `river_walk_report_${riverWalkId}.pdf`;
    console.log('📎 Final filename:', finalFileName);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    console.log('📋 Response headers set');

    // Verify the PDF buffer is valid
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty or invalid');
    }
    
    // Check if it starts with PDF magic bytes
    const pdfMagic = pdfBuffer.subarray(0, 4).toString();
    console.log('🔍 PDF magic bytes:', pdfMagic);
    
    // Debug: Check what the buffer actually contains
    const bufferPreview = pdfBuffer.subarray(0, 100).toString();
    console.log('🔍 Buffer preview (first 100 chars):', bufferPreview);
    
    if (!pdfMagic.startsWith('%PDF')) {
      console.error('❌ Generated buffer is not a valid PDF');
      console.error('❌ Buffer starts with:', bufferPreview);
      
      // Save debug content for development only
      if (process.env.NODE_ENV !== 'production') {
        try {
          const fs = require('fs');
          const debugPath = '/tmp/debug-invalid-pdf.html';
          fs.writeFileSync(debugPath, pdfBuffer);
          console.log('🔍 Invalid content saved to:', debugPath);
        } catch (writeError: any) {
          console.log('⚠️ Could not save debug file:', writeError?.message || 'Unknown error');
        }
      } else {
        // In production, log as Base64 for inspection
        const base64Content = pdfBuffer.toString('base64').substring(0, 500);
        console.log('🔍 Invalid content (Base64 preview):', base64Content);
      }
      
      throw new Error('Generated content is not a valid PDF');
    }

    // Send PDF
    console.log('📤 Sending PDF response...');
    res.status(200).send(pdfBuffer);
    console.log('🎉 PDF export completed successfully!');

  } catch (error) {
    console.error('PDF generation error:', error);
    
    // Reset browser instance on error
    try {
      const global = globalThis as any;
      if (global.browser) {
        await global.browser.close();
        global.browser = null;
      }
    } catch (closeError) {
      console.error('Error closing browser:', closeError);
    }

    res.status(500).json({ 
      error: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Increase timeout for PDF generation
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60, // 60 seconds for Vercel Pro
};