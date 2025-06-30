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

function createReportHTML(riverWalk: RiverWalk | null, sites: Site[] | null) {
  // Use real river walk data if available, otherwise sample data
  const reportData = riverWalk || {
    id: 'sample',
    name: 'Aldenham River Report',
    date: new Date().toISOString(),
    county: 'Hertfordshire',
    country: 'UK',
    notes: 'GCSE Geography Coursework - River Study Analysis'
  };

  // Always use real data if available, show empty state if no sites
  const sitesData = sites || [];

  // Helper functions
  const calculateAverageDepth = (site: any) => {
    if (!site.measurement_points || site.measurement_points.length === 0) return 0;
    const totalDepth = site.measurement_points.reduce((sum: number, point: any) => sum + point.depth, 0);
    return totalDepth / site.measurement_points.length;
  };

  const calculateMaxDepth = (site: any) => {
    if (!site.measurement_points || site.measurement_points.length === 0) return 0;
    return Math.max(...site.measurement_points.map((point: any) => point.depth));
  };

  const calculateAverageVelocity = (site: any) => {
    if (!site.velocity_data || !site.velocity_data.measurements || site.velocity_data.measurements.length === 0) return 0;
    const totalVelocity = site.velocity_data.measurements.reduce((sum: number, measurement: any) => sum + measurement.velocity_ms, 0);
    return totalVelocity / site.velocity_data.measurements.length;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportData.name}</title>
    <style>
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            body {
                margin: 0 !important;
                padding: 20px !important;
                background: white !important;
                color: black !important;
            }
            
            .pdf-component {
                break-inside: avoid !important;
            }
            
            .pdf-site-section {
                break-inside: avoid !important;
            }
            
            table {
                break-inside: auto !important;
            }
            
            thead {
                display: table-header-group !important;
            }
            
            tr {
                break-inside: avoid !important;
            }
            
            th, td {
                break-after: avoid !important;
            }
            
            .site-header {
                break-before: page !important;
            }
            
            .site-header:first-of-type {
                break-inside: avoid !important;
            }
            
            .site-header:first-child {
                break-before: auto !important;
            }
            
            .measurement-table {
                break-inside: avoid !important;
            }
        }
        
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            margin: 0;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        h1 {
            text-align: center;
            color: #2563eb;
            margin-bottom: 30px;
            font-size: 28px;
        }
        
        h2 {
            color: #1d4ed8;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        
        h3 {
            color: #2563eb;
            margin-top: 25px;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-box {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .summary-box h3 {
            margin-top: 0;
            color: #1e40af;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }
        
        th, td {
            border: 1px solid #d1d5db;
            padding: 12px;
            text-align: left;
        }
        
        th {
            background-color: #f3f4f6;
            font-weight: bold;
            color: #374151;
        }
        
        .site-section {
            margin-bottom: 40px;
        }
        
        .site-measurements {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        
        .measurement-box {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #bae6fd;
        }
        
        .measurement-box h4 {
            margin-top: 0;
            color: #0369a1;
        }
        
        .measurement-list {
            list-style: none;
            padding: 0;
        }
        
        .measurement-list li {
            margin: 8px 0;
        }
        
        .measurement-list strong {
            color: #1e40af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="pdf-component">
            <h1>${reportData.name}</h1>
            
            <div class="summary-grid">
                <div class="summary-box">
                    <h3>Study Details</h3>
                    <p><strong>Date:</strong> ${formatDate(reportData.date)}</p>
                    <p><strong>Location:</strong> ${reportData.county ? reportData.county + ', ' : ''}${reportData.country || 'UK'}</p>
                    ${reportData.notes ? `<p><strong>Notes:</strong> ${reportData.notes}</p>` : ''}
                </div>
                
                <div class="summary-box">
                    <h3>Summary Statistics</h3>
                    <p><strong>Total Sites:</strong> ${sitesData.length}</p>
                    <p><strong>Average Width:</strong> ${sitesData.length > 0 ? (sitesData.reduce((sum, site) => sum + site.river_width, 0) / sitesData.length).toFixed(2) : '0'}m</p>
                    <p><strong>Average Depth:</strong> ${sitesData.length > 0 ? (sitesData.reduce((sum, site) => sum + calculateAverageDepth(site), 0) / sitesData.length).toFixed(2) : '0'}m</p>
                </div>
            </div>

            <div class="pdf-component">
                <h2>Sites Overview</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Site</th>
                            <th>Width (m)</th>
                            <th>Avg Depth (m)</th>
                            <th>Max Depth (m)</th>
                            <th>Avg Velocity (m/s)</th>
                            <th>Cross-sectional Area (m²)</th>
                            <th>Discharge (m³/s)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sitesData.length === 0 ? `
                            <tr>
                                <td colspan="7" style="text-align: center; padding: 20px; color: #6b7280; font-style: italic;">
                                    No sites recorded yet. Add measurement sites to see data here.
                                </td>
                            </tr>
                        ` : sitesData.map(site => `
                            <tr>
                                <td>${site.site_number}</td>
                                <td>${site.river_width}</td>
                                <td>${calculateAverageDepth(site).toFixed(2)}</td>
                                <td>${calculateMaxDepth(site).toFixed(2)}</td>
                                <td>${calculateAverageVelocity(site).toFixed(2)}</td>
                                <td>${(site.river_width * calculateAverageDepth(site)).toFixed(2)}</td>
                                <td>${(site.river_width * calculateAverageDepth(site) * calculateAverageVelocity(site)).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        ${sitesData.length === 0 ? `
            <div class="pdf-site-section site-section">
                <h2>Individual Site Data</h2>
                <div style="text-align: center; padding: 40px; color: #6b7280; font-style: italic; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <p style="font-size: 18px; margin-bottom: 10px;">No measurement sites recorded yet</p>
                    <p>Site-specific data will appear here once measurement sites are added to this river walk.</p>
                </div>
            </div>
        ` : sitesData.map((site, index) => `
            <div class="pdf-site-section site-section ${index > 0 ? 'site-header' : ''}">
                <h2>Site ${site.site_number}</h2>
                
                <div class="site-measurements">
                    <div class="measurement-box">
                        <h4>Measurements</h4>
                        <ul class="measurement-list">
                            <li><strong>Width:</strong> ${site.river_width}m</li>
                            <li><strong>Average Depth:</strong> ${calculateAverageDepth(site).toFixed(2)}m</li>
                            <li><strong>Maximum Depth:</strong> ${calculateMaxDepth(site).toFixed(2)}m</li>
                            <li><strong>Average Velocity:</strong> ${calculateAverageVelocity(site).toFixed(2)}m/s</li>
                        </ul>
                    </div>
                    
                    <div class="measurement-box">
                        <h4>Calculated Values</h4>
                        <ul class="measurement-list">
                            <li><strong>Cross-sectional Area:</strong> ${(site.river_width * calculateAverageDepth(site)).toFixed(2)}m²</li>
                            <li><strong>Discharge:</strong> ${(site.river_width * calculateAverageDepth(site) * calculateAverageVelocity(site)).toFixed(2)}m³/s</li>
                            <li><strong>Wetted Perimeter:</strong> ${(site.river_width + 2 * calculateAverageDepth(site)).toFixed(2)}m</li>
                        </ul>
                    </div>
                </div>

                ${site.measurement_points && site.measurement_points.length > 0 ? `
                    <div class="measurement-table">
                        <h3>Measurement Points</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Point</th>
                                    <th>Distance from Bank (m)</th>
                                    <th>Depth (m)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${site.measurement_points
                                  .sort((a, b) => a.point_number - b.point_number)
                                  .map(point => `
                                    <tr>
                                        <td>${point.point_number}</td>
                                        <td>${point.distance_from_bank}</td>
                                        <td>${point.depth}</td>
                                    </tr>
                                  `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>
  `;
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
    console.log('🔍 Fetching real data for river walk ID:', riverWalkId);
    
    // Try to fetch the actual data first
    const { data: riverWalk, error: riverWalkError } = await supabase
      .from('river_walks')
      .select('*')
      .eq('id', riverWalkId)
      .maybeSingle();

    console.log('📊 River walk query result:', { riverWalk, riverWalkError });

    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select(`
        *,
        measurement_points (*),
        velocity_data (*)
      `)
      .eq('river_walk_id', riverWalkId)
      .order('site_number');

    console.log('📍 Sites query result:', { sitesCount: sites?.length || 0, sitesError });

    console.log('📊 Data summary:', {
      hasRiverWalk: !!riverWalk,
      riverWalkName: riverWalk?.name,
      sitesCount: sites?.length || 0,
      riverWalkError: riverWalkError?.message,
      sitesError: sitesError?.message
    });

    if (riverWalk && !riverWalkError) {
      console.log('✅ Using real river walk data:', riverWalk.name);
      if (sites && sites.length > 0) {
        console.log('✅ Found', sites.length, 'real sites');
      } else {
        console.log('ℹ️ No sites found for this river walk - will show empty state');
      }
    } else {
      console.log('⚠️ Could not fetch river walk data, will use sample data');
    }

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

    // Create HTML content directly with the data
    console.log('🔧 Creating HTML content with fetched data...');
    
    const htmlContent = createReportHTML(riverWalk, sites);
    
    console.log('📄 Setting page content...');
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });

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