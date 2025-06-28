import { NextApiRequest, NextApiResponse } from 'next';
import { chromium } from 'playwright-core';
const chromiumBinary = require('@sparticuz/chromium');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 PDF Export API called');
  console.log('📝 Request method:', req.method);
  console.log('📦 Request body:', req.body);
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('🏗️ Vercel region:', process.env.VERCEL_REGION);

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

  let browser;
  
  try {
    console.log('🌐 Starting browser launch...');
    
    // Get optimized Chromium executable path for serverless
    console.log('🔍 Getting serverless Chromium executable path...');
    const executablePath = await chromiumBinary.executablePath();
    console.log('📍 Chromium executable path:', executablePath);
    
    // Launch browser with optimized settings for Vercel
    browser = await chromium.launch({
      args: chromiumBinary.args,
      executablePath: executablePath,
      headless: true,
    });
    console.log('✅ Browser launched successfully');

    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
    });
    console.log('📱 Browser context created');

    const page = await context.newPage();
    console.log('📄 New page created');

    // Optimize memory usage by blocking heavy resources
    console.log('🚫 Setting up resource blocking for optimization...');
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font'].includes(resourceType)) {
        console.log(`🚫 Blocking ${resourceType}: ${route.request().url()}`);
        route.abort();
      } else {
        route.continue();
      }
    });

    // Navigate to the print-friendly page
    const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:3000`;
    const printUrl = `${baseUrl}/print-report?id=${riverWalkId}`;
    
    console.log('🔗 Base URL:', baseUrl);
    console.log('🎯 Navigating to:', printUrl);
    
    const startTime = Date.now();
    await page.goto(printUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    const navigationTime = Date.now() - startTime;
    console.log(`✅ Page loaded in ${navigationTime}ms`);

    console.log('⏳ Waiting for charts to load...');
    await page.waitForTimeout(3000);
    console.log('✅ Charts loading wait completed');

    console.log('🖨️ Starting PDF generation...');
    const pdfStartTime = Date.now();
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      printBackground: true,
      preferCSSPageSize: false,
    });
    const pdfGenerationTime = Date.now() - pdfStartTime;
    console.log(`✅ PDF generated in ${pdfGenerationTime}ms`);
    console.log('📊 PDF buffer size:', pdfBuffer.length, 'bytes');

    console.log('🔒 Closing browser...');
    await browser.close();
    console.log('✅ Browser closed');

    // Set response headers
    const finalFileName = fileName || `river_walk_report_${riverWalkId}.pdf`;
    console.log('📎 Final filename:', finalFileName);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    console.log('📋 Response headers set');

    // Send PDF
    console.log('📤 Sending PDF response...');
    res.status(200).send(pdfBuffer);
    console.log('🎉 PDF export completed successfully!');

  } catch (error) {
    console.error('PDF generation error:', error);
    
    if (browser) {
      try {
        await browser.close();
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
  },
};