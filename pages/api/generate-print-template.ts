import { NextApiRequest, NextApiResponse } from 'next';
import chromium from '@sparticuz/chromium-min';
import puppeteerCore from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import type { RiverWalk, Site } from '../../types';
import { corsMiddleware } from '../../lib/cors';
import { logger } from '../../lib/logger';

export const dynamic = 'force-dynamic';

async function getBrowser() {
  const REMOTE_PATH = process.env.CHROMIUM_REMOTE_EXEC_PATH;
  const LOCAL_PATH = process.env.CHROMIUM_LOCAL_EXEC_PATH;
  
  if (!REMOTE_PATH && !LOCAL_PATH) {
    throw new Error('Missing a path for chromium executable');
  }

  if (!!REMOTE_PATH) {
    logger.info('Using remote Chromium executable');
    return await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(REMOTE_PATH),
      defaultViewport: null,
      headless: true,
    });
  }

  logger.info('Using local Chromium executable');
  return await puppeteerCore.launch({
    executablePath: LOCAL_PATH,
    defaultViewport: null,
    headless: true,
  });
}

const CSS_STYLES = `
@page {
  margin: 20mm;
  size: A4;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background: white;
  margin: 0;
  padding: 20px;
}

.template-container {
  max-width: 210mm;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  border-bottom: 2px solid #3b82f6;
}

.header h1 {
  margin: 0 0 10px 0;
  color: #3b82f6;
  font-size: 24px;
}

.header p {
  margin: 5px 0;
  color: #666;
}

.instructions {
  background: #f0f9ff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  border-left: 4px solid #3b82f6;
}

.instructions h2 {
  margin: 0 0 15px 0;
  color: #3b82f6;
  font-size: 18px;
}

.instructions ul {
  margin: 10px 0;
  padding-left: 20px;
}

.instructions li {
  margin: 5px 0;
}

.section {
  margin-bottom: 40px;
  page-break-inside: avoid;
}

.section h2 {
  background: #3b82f6;
  color: white;
  padding: 10px 15px;
  margin: 0 0 20px 0;
  border-radius: 4px;
  font-size: 16px;
}

.site-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  page-break-inside: avoid;
}

.site-header {
  background: #f8fafc;
  padding: 15px;
  margin: -20px -20px 20px -20px;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e5e7eb;
}

.site-header h3 {
  margin: 0;
  color: #3b82f6;
  font-size: 18px;
}

.field-group {
  margin-bottom: 20px;
}

.field-row {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.field {
  flex: 1;
  min-width: 200px;
}

.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 5px;
  color: #374151;
}

.field input[type="text"], .field input[type="number"], .field textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 16px;
  background: white;
  box-sizing: border-box;
  min-height: 40px;
}

.field textarea {
  height: 120px;
  resize: vertical;
}

.field.large-field input[type="text"] {
  min-height: 60px;
}

.field.extra-large-field textarea {
  height: 180px;
}

.measurement-table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}

.measurement-table th,
.measurement-table td {
  border: 1px solid #d1d5db;
  padding: 15px 10px;
  text-align: left;
  height: 50px;
}

.measurement-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
}

.measurement-table input {
  width: 100%;
  padding: 10px;
  border: none;
  background: transparent;
  font-size: 16px;
  min-height: 35px;
}

.checkbox-group {
  display: flex;
  gap: 20px;
  margin: 15px 0;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  font-weight: normal;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  margin-right: 8px;
}

.notes-section {
  background: #fef3c7;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #f59e0b;
  margin-top: 20px;
}

.notes-section h4 {
  margin: 0 0 10px 0;
  color: #92400e;
}

.footer {
  text-align: center;
  margin-top: 40px;
  padding: 20px;
  border-top: 2px solid #3b82f6;
  color: #666;
  font-size: 14px;
}

.no-mobile {
  background: #ecfdf5;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #10b981;
  margin: 20px 0;
}

.no-mobile h4 {
  margin: 0 0 10px 0;
  color: #065f46;
}

.no-mobile p {
  margin: 0;
  color: #047857;
}

@media print {
  .page-break {
    page-break-before: always;
  }
  
  h4 {
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  
  .measurement-section {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .measurement-table {
    page-break-inside: auto;
  }
  
  .measurement-table thead {
    page-break-after: avoid;
  }
  
  .measurement-table tr {
    page-break-inside: avoid;
  }
}
`;

function createPrintTemplateHTML(riverWalk: RiverWalk | null, siteCount: number) {
  const reportData = riverWalk || {
    id: 'template',
    name: 'River Study Template',
    date: new Date().toISOString(),
    county: '',
    country: 'UK',
    notes: ''
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const sites = Array.from({ length: siteCount }, (_, i) => i + 1);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>River Study Data Collection Template</title>
    <style>
        ${CSS_STYLES}
    </style>
</head>
<body>
    <div class="template-container">
        <div class="header">
            <h1>River Study Data Collection Template</h1>
            <p><strong>Study Name:</strong> _________________</p>
            <p><strong>Date:</strong> _________________</p>
            <p><strong>Location:</strong> _________________</p>
            <p><strong>Number of Sites:</strong> ${siteCount}</p>
        </div>

        <div class="instructions">
            <h2>📋 Instructions for Field Data Collection</h2>
            <p><strong>No Mobile, No Problem!</strong> Use this template to record your measurements on paper, then input the data digitally when you return.</p>
            
            <h3>Equipment Needed:</h3>
            <ul>
                <li>Measuring tape (30m minimum)</li>
                <li>Depth probe or ranging pole</li>
                <li>Flow meter or float (cork/stick)</li>
                <li>Stopwatch</li>
                <li>Digital calipers or ruler</li>
                <li>GPS device or smartphone</li>
                <li>Camera for site photos</li>
                <li>Sediment collection bags</li>
            </ul>

            <h3>General Data Collection Tips:</h3>
            <ul>
                <li>Record all measurements to 2 decimal places where possible</li>
                <li>Take photos of each site and sediment samples</li>
                <li>Note weather conditions and any unusual observations</li>
                <li>Work systematically from upstream to downstream</li>
                <li>Ensure safety at all times - never work alone near water</li>
            </ul>
        </div>

        <div class="no-mobile">
            <h4>🌱 Perfect for Field Studies</h4>
            <p>This template is designed for locations where mobile devices aren't practical or allowed. Collect your data on paper, then digitize it later using the Riverwalks platform for professional analysis and reporting.</p>
        </div>

        <div class="section">
            <h2>📍 Study Information</h2>
            <div class="field-row">
                <div class="field">
                    <label for="study-name">Study Name:</label>
                    <input type="text" id="study-name" value="" />
                </div>
                <div class="field">
                    <label for="date">Date:</label>
                    <input type="text" id="date" value="" />
                </div>
            </div>
            <div class="field-row">
                <div class="field">
                    <label for="location">Location:</label>
                    <input type="text" id="location" value="" />
                </div>
                <div class="field">
                    <label for="weather">Weather Conditions:</label>
                    <input type="text" id="weather" />
                </div>
            </div>
            <div class="field extra-large-field">
                <label for="study-notes">Study Notes:</label>
                <textarea id="study-notes"></textarea>
            </div>
        </div>

        ${sites.map(siteNumber => `
            <div class="site-section page-break">
                <div class="site-header">
                    <h3>Site ${siteNumber}</h3>
                </div>

                <div class="field-group">
                    <div class="field-row">
                        <div class="field">
                            <label for="site-${siteNumber}-name">Site Name:</label>
                            <input type="text" id="site-${siteNumber}-name" />
                        </div>
                        <div class="field">
                            <label for="site-${siteNumber}-width">River Width (m):</label>
                            <input type="number" id="site-${siteNumber}-width" step="0.01" />
                        </div>
                    </div>
                    <div class="field-row">
                        <div class="field">
                            <label for="site-${siteNumber}-lat">Latitude:</label>
                            <input type="number" id="site-${siteNumber}-lat" step="0.000001" />
                        </div>
                        <div class="field">
                            <label for="site-${siteNumber}-lon">Longitude:</label>
                            <input type="number" id="site-${siteNumber}-lon" step="0.000001" />
                        </div>
                    </div>
                    <div class="field-row">
                        <div class="field large-field">
                            <label for="site-${siteNumber}-weather">Weather:</label>
                            <input type="text" id="site-${siteNumber}-weather" />
                        </div>
                        <div class="field large-field">
                            <label for="site-${siteNumber}-land-use">Land Use:</label>
                            <input type="text" id="site-${siteNumber}-land-use" />
                        </div>
                    </div>
                </div>

                <div class="measurement-section">
                    <h4>📏 Cross-Section Measurements</h4>
                    <table class="measurement-table">
                    <thead>
                        <tr>
                            <th>Point #</th>
                            <th>Distance from Bank (m)</th>
                            <th>Depth (m)</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from({ length: 15 }, (_, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td><input type="number" step="0.01" /></td>
                                <td><input type="number" step="0.01" /></td>
                                <td><input type="text" /></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    </table>
                </div>

                <div class="measurement-section">
                    <h4>🌊 Velocity Measurements</h4>
                    <table class="measurement-table">
                    <thead>
                        <tr>
                            <th>Measurement #</th>
                            <th>Distance (m)</th>
                            <th>Time (seconds)</th>
                            <th>Velocity (m/s)</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from({ length: 5 }, (_, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td><input type="number" step="0.01" /></td>
                                <td><input type="number" step="0.01" /></td>
                                <td><input type="number" step="0.01" /></td>
                                <td><input type="text" /></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    </table>
                </div>

                <div class="measurement-section">
                    <h4>🪨 Sediment Analysis</h4>
                    <table class="measurement-table">
                    <thead>
                        <tr>
                            <th>Sample #</th>
                            <th>Size (mm)</th>
                            <th>Roundness (1-6)</th>
                            <th>Type</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from({ length: 20 }, (_, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td><input type="number" step="0.01" /></td>
                                <td><input type="number" min="1" max="6" /></td>
                                <td><input type="text" /></td>
                                <td><input type="text" /></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    </table>
                </div>

                <div class="notes-section">
                    <h4>📝 Site Notes & Observations</h4>
                    <div class="field extra-large-field">
                        <label for="site-${siteNumber}-notes">Additional Notes:</label>
                        <textarea id="site-${siteNumber}-notes"></textarea>
                    </div>
                </div>

                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" /> Site photo taken
                    </label>
                    <label>
                        <input type="checkbox" /> Sediment photo taken
                    </label>
                    <label>
                        <input type="checkbox" /> GPS coordinates recorded
                    </label>
                    <label>
                        <input type="checkbox" /> All measurements complete
                    </label>
                </div>
            </div>
        `).join('')}

        <div class="footer">
            <p><strong>Next Steps:</strong> After completing your field work, visit <strong>riverwalks.co.uk</strong> to input your data and generate professional analysis reports.</p>
            <p>© 2025 Riverwalks - Print Template</p>
        </div>
    </div>
</body>
</html>
  `;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS securely
  if (!corsMiddleware(req, res)) {
    return; // CORS handled the response
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { riverWalkId, siteCount, fileName } = req.body as { 
    riverWalkId?: string; 
    siteCount: number; 
    fileName?: string; 
  };

  if (!siteCount || siteCount < 1 || siteCount > 20) {
    return res.status(400).json({ error: 'Site count must be between 1 and 20' });
  }

  let browser;
  try {
    logger.info('Generating print template', { siteCount });
    
    let riverWalk = null;
    
    if (riverWalkId) {
      // Create authenticated Supabase client
      const authToken = req.headers.authorization?.replace('Bearer ', '');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
          }
        });
        
        // Fetch river walk data
        const { data, error } = await supabase
          .from('river_walks')
          .select('*')
          .eq('id', riverWalkId)
          .maybeSingle();

        if (!error && data) {
          riverWalk = data;
        }
      }
    }

    logger.info('Starting browser');
    browser = await getBrowser();
    
    logger.debug('Creating new page');
    const page = await browser.newPage();

    // Error handling for page
    page.on('pageerror', (err: Error) => {
      logger.error('Page error', { errorMessage: err.message });
    });
    
    page.on('error', (err: Error) => {
      logger.error('Page runtime error', { errorMessage: err.message });
    });

    // Create HTML content
    logger.debug('Creating HTML content');
    const htmlContent = createPrintTemplateHTML(riverWalk, siteCount);
    
    logger.debug('Setting page content');
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    logger.debug('Setting viewport');
    await page.setViewport({ width: 1080, height: 1024 });

    // Wait for content to render
    logger.debug('Waiting for content to render');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate PDF
    logger.info('Generating PDF');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '20mm', 
        right: '20mm', 
        bottom: '20mm', 
        left: '20mm' 
      },
      preferCSSPageSize: true,
      scale: 1.0
    });

    await page.close();
    await browser.close();

    const pdfBuffer = Buffer.from(pdf);
    const download = fileName || `river_study_template_${siteCount}_sites.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${download}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    logger.info('Template generated successfully');
    res.status(200).send(pdfBuffer);

  } catch (err: any) {
    logger.error('Template generation error', { errorMessage: err?.message });
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        logger.error('Error closing browser', { error: closeErr instanceof Error ? closeErr.message : 'Unknown error' });
      }
    }
    
    return res.status(500).json({
      error: 'Failed to generate print template',
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