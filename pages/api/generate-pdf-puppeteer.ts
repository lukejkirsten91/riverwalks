// pages/api/generate-pdf-puppeteer.ts
import { NextApiRequest, NextApiResponse } from 'next';
import chromium from '@sparticuz/chromium-min';
import puppeteerCore, { Browser } from 'puppeteer-core';
import { Mutex } from 'async-mutex';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// shared browser instance + mutex
// ─────────────────────────────────────────────────────────────────────────────
const lock = new Mutex();

type GlobalWithBrowser = typeof globalThis & { _puppeteer?: Browser };

async function getBrowser(): Promise<Browser> {
  const g = globalThis as GlobalWithBrowser;

  // purge stale instance (after lambda freeze/thaw)
  if (
    g._puppeteer &&
    (!g._puppeteer.isConnected() ||
      (typeof g._puppeteer.process === 'function' &&
        g._puppeteer.process()?.killed))
  ) {
    g._puppeteer = undefined;
  }
  if (g._puppeteer) return g._puppeteer;

  g._puppeteer = await puppeteerCore.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true, // Use true for stable headless mode
  });

  return g._puppeteer;
}

// ─────────────────────────────────────────────────────────────────────────────
// API route
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { riverWalkId, fileName } = req.body as {
    riverWalkId?: string;
    fileName?: string;
  };
  if (!riverWalkId) {
    return res.status(400).json({ error: 'River walk ID is required' });
  }

  try {
    // one browser-page at a time per lambda
    const pdfBuffer = await lock.runExclusive(async () => {
      const browser = await getBrowser();
      const page = await browser.newPage();

      await page.setViewport({ width: 1240, height: 1754 });
      await page.emulateMediaType('screen');

      const base =
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXTAUTH_URL || 'http://localhost:3000';

      const url = `${base}/print-report?id=${riverWalkId}`;
      const resp = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60_000,
      });
      if (!resp || resp.status() !== 200) {
        throw new Error(`Print page status ${resp?.status()}`);
      }

      // optional readiness flag (ignore timeout)
      await page
        .waitForFunction(() => (window as any).__REPORT_READY === true, {
          timeout: 30_000,
        })
        .catch(() => void 0);

      const buffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true,
        preferCSSPageSize: true,
      });
      await page.close();
      return buffer;
    });

    if (pdfBuffer.subarray(0, 4).toString() !== '%PDF') {
      throw new Error('Generated content is not a PDF');
    }

    const download = fileName || `river_walk_report_${riverWalkId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${download}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(200).send(pdfBuffer);
  } catch (err: any) {
    // on failure drop cached browser so next run starts clean
    try {
      const g = globalThis as GlobalWithBrowser;
      await g._puppeteer?.close();
      g._puppeteer = undefined;
    } catch {
      /* ignore */
    }

    return res.status(500).json({
      error: 'Failed to generate PDF',
      details: err?.message ?? 'Unknown error',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Vercel config
// ─────────────────────────────────────────────────────────────────────────────
export const config = {
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: '10mb' },
  },
  maxDuration: 60,
};