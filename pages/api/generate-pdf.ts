// pages/api/generate-pdf.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { chromium as playwrightChromium, Browser } from 'playwright';
import { Mutex } from 'async-mutex';

export const dynamic = 'force-dynamic';

/* ────────────────────────────────────────────────────────────────────────────
   shared browser (cached across warm invocations) + mutex for one-at-a-time
   ────────────────────────────────────────────────────────────────────────── */
const lock = new Mutex();
type Global = typeof globalThis & { _browser?: Browser };

async function getBrowser(): Promise<Browser> {
  const g = globalThis as Global;

  if (g._browser && !g._browser.isConnected()) {
    g._browser = undefined;
  }
  if (g._browser) return g._browser;

  // Use Playwright's built-in Chromium - no external binaries
  g._browser = await playwrightChromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });

  return g._browser;
}

/* ────────────────────────────────────────────────────────────────────────────
   API route
   ────────────────────────────────────────────────────────────────────────── */
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

  try {
    const pdfBuffer = await lock.runExclusive(async () => {
      const browser = await getBrowser();
      const page = await browser.newPage();

      await page.setViewportSize({ width: 1240, height: 1754 });
      await page.emulateMedia({ media: 'screen' });

      const base =
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXTAUTH_URL || 'http://localhost:3000';

      const url = `${base}/print-report?id=${riverWalkId}`;
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
      if (!resp || resp.status() !== 200) throw new Error(`print-report status ${resp?.status()}`);

      await page
        .waitForFunction(() => (window as any).__REPORT_READY === true, { timeout: 30_000 })
        .catch(() => {});

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
    try {
      const g = globalThis as Global;
      await g._browser?.close();
      g._browser = undefined;
    } catch {}

    return res.status(500).json({
      error: 'Failed to generate PDF',
      details: err?.message ?? 'Unknown error',
    });
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   Vercel config
   ────────────────────────────────────────────────────────────────────────── */
export const config = {
  api: { responseLimit: false, bodyParser: { sizeLimit: '10mb' } },
  maxDuration: 60,
};