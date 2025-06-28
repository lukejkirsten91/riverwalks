import { NextApiRequest, NextApiResponse } from 'next';
import chromium from '@sparticuz/chromium-min';
import puppeteerCore from 'puppeteer-core';
import puppeteer from 'puppeteer';

export const dynamic = 'force-dynamic';

const remoteExecutablePath = 
  'https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar';

let browser: any;

async function getBrowser() {
  if (browser) return browser;

  // Check if we're in production (Vercel)
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    console.log('🌐 Launching browser for production (Vercel)...');
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(remoteExecutablePath),
      headless: true,
    });
  } else {
    console.log('🖥️ Launching browser for local development...');
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
  }
  
  return browser;
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

  let browserInstance;
  
  try {
    console.log('🌐 Getting browser instance...');
    browserInstance = await getBrowser();
    console.log('✅ Browser instance obtained');

    const page = await browserInstance.newPage();
    console.log('📄 New page created');

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800 });

    // Navigate to the print-friendly page
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const printUrl = `${baseUrl}/print-report?id=${riverWalkId}`;
    
    console.log('🔗 Base URL:', baseUrl);
    console.log('🎯 Navigating to:', printUrl);
    
    const startTime = Date.now();
    await page.goto(printUrl, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    const navigationTime = Date.now() - startTime;
    console.log(`✅ Page loaded in ${navigationTime}ms`);

    // Wait for content to fully render, especially charts
    console.log('⏳ Waiting for charts and content to render...');
    await new Promise(resolve => setTimeout(resolve, 5000));

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
      // Enhanced options for better page breaks
      tagged: true,
      outline: false,
    });
    
    const pdfGenerationTime = Date.now() - pdfStartTime;
    console.log(`✅ PDF generated in ${pdfGenerationTime}ms`);
    console.log('📊 PDF buffer size:', pdfBuffer.length, 'bytes');

    // Close the page but keep browser instance for reuse
    await page.close();
    console.log('✅ Page closed');

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
    if (!pdfMagic.startsWith('%PDF')) {
      console.error('❌ Generated buffer is not a valid PDF');
      throw new Error('Generated content is not a valid PDF');
    }

    // Send PDF
    console.log('📤 Sending PDF response...');
    res.status(200).send(pdfBuffer);
    console.log('🎉 PDF export completed successfully!');

  } catch (error) {
    console.error('PDF generation error:', error);
    
    if (browserInstance) {
      try {
        // Only close browser in case of error, keep it for reuse otherwise
        await browserInstance.close();
        browser = null; // Reset for next request
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
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