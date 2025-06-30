// pages/api/generate-pdf-puppeteer-remote.ts
import { NextApiRequest, NextApiResponse } from 'next';
import chromium from '@sparticuz/chromium-min';
import puppeteerCore from 'puppeteer-core';
import { supabase } from '../../lib/supabase';
import type { RiverWalk, Site } from '../../types';

export const dynamic = 'force-dynamic';

async function getBrowser() {
  const REMOTE_PATH = process.env.CHROMIUM_REMOTE_EXEC_PATH;
  const LOCAL_PATH = process.env.CHROMIUM_LOCAL_EXEC_PATH;
  
  if (!REMOTE_PATH && !LOCAL_PATH) {
    throw new Error('Missing a path for chromium executable');
  }

  if (!!REMOTE_PATH) {
    console.log('🌐 Using remote Chromium executable');
    return await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(REMOTE_PATH),
      defaultViewport: null,
      headless: true,
    });
  }

  console.log('💻 Using local Chromium executable');
  return await puppeteerCore.launch({
    executablePath: LOCAL_PATH,
    defaultViewport: null,
    headless: true,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { riverWalkId, fileName } = req.body as { riverWalkId?: string; fileName?: string };
  if (!riverWalkId) {
    return res.status(400).json({ error: 'River walk ID is required' });
  }

  let browser;
  try {
    console.log('🔍 Skipping database lookup - using print-report page with sample data fallback');
    console.log('🎯 River walk ID:', riverWalkId);

    console.log('🚀 Starting browser...');
    browser = await getBrowser();
    
    console.log('📄 Creating new page...');
    const page = await browser.newPage();

    // Error handling for page
    page.on('pageerror', (err: Error) => {
      console.error('📄 Page error:', err);
    });
    
    page.on('error', (err: Error) => {
      console.error('📄 Page runtime error:', err);
    });

    // Build the report URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    const reportUrl = `${baseUrl}/print-report/${riverWalkId}`;
    
    console.log('🌐 Navigating to:', reportUrl);
    console.log('🔧 Environment - VERCEL_URL:', process.env.VERCEL_URL);
    
    try {
      const response = await page.goto(reportUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      console.log('📄 Page response status:', response?.status());
      if (response && response.status() >= 400) {
        throw new Error(`Page returned ${response.status()} status`);
      }
    } catch (navError) {
      console.error('❌ Navigation failed:', navError);
      throw new Error(`Failed to navigate to report page: ${navError instanceof Error ? navError.message : String(navError)}`);
    }

    console.log('📐 Setting viewport...');
    await page.setViewport({ width: 1080, height: 1024 });

    // Wait for content to render
    console.log('⏳ Waiting for content to render...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate PDF with proper page break controls
    console.log('📄 Generating PDF...');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '20mm', 
        right: '15mm', 
        bottom: '20mm', 
        left: '15mm' 
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      scale: 1.0,
    });

    await page.close();
    await browser.close();

    const pdfBuffer = Buffer.from(pdf);
    const download = fileName || `river_walk_report_${riverWalkId}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${download}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    console.log('✅ PDF generated successfully');
    res.status(200).send(pdfBuffer);

  } catch (err: any) {
    console.error('❌ PDF generation error:', err);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error('❌ Error closing browser:', closeErr);
      }
    }
    
    return res.status(500).json({
      error: 'Failed to generate PDF',
      details: err?.message ?? 'Unknown error',
    });
  }
}

export const config = {
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: '10mb' },
  },
  maxDuration: 60,
};