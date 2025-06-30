// pages/api/generate-pdf-puppeteer-remote.ts
import { NextApiRequest, NextApiResponse } from 'next';
import chromium from '@sparticuz/chromium-min';
import puppeteerCore from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
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

  const calculateCrossSectionalArea = (site: any) => {
    return site.river_width * calculateAverageDepth(site);
  };

  const calculateDischarge = (site: any) => {
    return calculateCrossSectionalArea(site) * calculateAverageVelocity(site);
  };

  const calculateAverageSedimentSize = (site: any) => {
    if (!site.sedimentation_data || !site.sedimentation_data.measurements || site.sedimentation_data.measurements.length === 0) return 0;
    const totalSize = site.sedimentation_data.measurements.reduce((sum: number, measurement: any) => sum + measurement.sediment_size, 0);
    return totalSize / site.sedimentation_data.measurements.length;
  };

  const calculateAverageSedimentRoundness = (site: any) => {
    if (!site.sedimentation_data || !site.sedimentation_data.measurements || site.sedimentation_data.measurements.length === 0) return 0;
    const totalRoundness = site.sedimentation_data.measurements.reduce((sum: number, measurement: any) => sum + measurement.sediment_roundness, 0);
    return totalRoundness / site.sedimentation_data.measurements.length;
  };

  const calculateSpearmansRank = (site: any) => {
    if (!site.sedimentation_data || !site.sedimentation_data.measurements || site.sedimentation_data.measurements.length < 3) return 0;
    
    const measurements = site.sedimentation_data.measurements;
    const n = measurements.length;
    
    // Rank the size measurements
    const sizeRanks = measurements
      .map((m: any, i: number) => ({ value: m.sediment_size, index: i }))
      .sort((a: any, b: any) => b.value - a.value)
      .map((item: any, rank: number) => ({ index: item.index, rank: rank + 1 }))
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => item.rank);
    
    // Rank the roundness measurements
    const roundnessRanks = measurements
      .map((m: any, i: number) => ({ value: m.sediment_roundness, index: i }))
      .sort((a: any, b: any) => b.value - a.value)
      .map((item: any, rank: number) => ({ index: item.index, rank: rank + 1 }))
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => item.rank);
    
    // Calculate Spearman's rank correlation coefficient
    let sumD2 = 0;
    for (let i = 0; i < n; i++) {
      const d = sizeRanks[i] - roundnessRanks[i];
      sumD2 += d * d;
    }
    
    const rs = 1 - (6 * sumD2) / (n * (n * n - 1));
    return rs;
  };

  const getSedimentRoundnessDescription = (roundness: number) => {
    if (roundness >= 5.5) return 'Very Angular';
    if (roundness >= 4.5) return 'Angular';
    if (roundness >= 3.5) return 'Sub-Angular';
    if (roundness >= 2.5) return 'Sub-Rounded';
    if (roundness >= 1.5) return 'Rounded';
    return 'Very Rounded';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Summary calculations
  const totalSites = sitesData.length;
  const totalArea = sitesData.reduce((sum, site) => sum + calculateCrossSectionalArea(site), 0);
  const avgVelocity = sitesData.length > 0 ? sitesData.reduce((sum, site) => sum + calculateAverageVelocity(site), 0) / sitesData.length : 0;
  const totalDischarge = sitesData.reduce((sum, site) => sum + calculateDischarge(site), 0);

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
            
            .page-break-before {
                break-before: page !important;
                page-break-before: always !important;
            }
            
            .page-break-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
            
            .chart-container {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
            
            table {
                break-inside: auto !important;
            }
            
            thead {
                display: table-header-group !important;
            }
            
            tr {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
            
            th, td {
                break-after: avoid !important;
            }
            
            .summary-table {
                break-inside: avoid !important;
            }
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.5;
            color: #1f2937;
            background: white;
            margin: 0;
            padding: 20px;
        }
        
        .container {
            max-width: 210mm;
            margin: 0 auto;
        }
        
        /* Header styles */
        .report-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px 0;
            border-bottom: 3px solid #2563eb;
        }
        
        .report-title {
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
            margin: 0 0 10px 0;
        }
        
        .report-subtitle {
            font-size: 18px;
            color: #6b7280;
            margin: 0;
        }
        
        /* KPI Grid */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin: 30px 0;
        }
        
        .kpi-card {
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e5e7eb;
        }
        
        .kpi-blue { background: #dbeafe; border-color: #3b82f6; }
        .kpi-green { background: #dcfce7; border-color: #22c55e; }
        .kpi-purple { background: #f3e8ff; border-color: #a855f7; }
        .kpi-orange { background: #fed7aa; border-color: #f97316; }
        
        .kpi-value {
            font-size: 24px;
            font-weight: bold;
            margin: 0 0 5px 0;
        }
        
        .kpi-blue .kpi-value { color: #1d4ed8; }
        .kpi-green .kpi-value { color: #16a34a; }
        .kpi-purple .kpi-value { color: #9333ea; }
        .kpi-orange .kpi-value { color: #ea580c; }
        
        .kpi-label {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
        }
        
        /* Study info */
        .study-info {
            background: #f8fafc;
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
            border: 1px solid #e2e8f0;
        }
        
        .study-info h3 {
            margin: 0 0 15px 0;
            color: #1e40af;
            font-size: 18px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
        }
        
        /* Table styles */
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            font-size: 13px;
            background: white;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .summary-table th {
            padding: 12px 8px;
            text-align: center;
            font-weight: 600;
            font-size: 12px;
            border: 1px solid #d1d5db;
        }
        
        .summary-table td {
            padding: 10px 8px;
            text-align: center;
            border: 1px solid #d1d5db;
        }
        
        .table-blue th { background: #dbeafe; color: #1e40af; }
        .table-green th { background: #dcfce7; color: #166534; }
        .table-amber th { background: #fef3c7; color: #92400e; }
        
        .table-blue .summary-col { background: #bfdbfe; }
        .table-green .summary-col { background: #bbf7d0; }
        .table-amber .summary-col { background: #fde68a; }
        
        .section-header {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin: 40px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #3b82f6;
        }
        
        /* Site page styles */
        .site-page {
            min-height: 100vh;
        }
        
        .site-header {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        
        .site-title {
            font-size: 28px;
            font-weight: bold;
            margin: 0 0 20px 0;
        }
        
        .site-info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }
        
        .site-info-item h4 {
            margin: 0 0 5px 0;
            font-size: 14px;
            opacity: 0.9;
        }
        
        .site-info-item p {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        /* Site content sections */
        .site-section {
            margin: 30px 0;
            padding: 25px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        
        .site-section h3 {
            margin: 0 0 20px 0;
            font-size: 20px;
            color: #1e40af;
        }
        
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        
        .metric-card {
            text-align: center;
            padding: 15px;
            background: #f8fafc;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        
        .metric-value {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
            margin: 0 0 5px 0;
        }
        
        .metric-label {
            font-size: 12px;
            color: #6b7280;
            margin: 0;
        }
        
        /* Cross-section chart placeholder */
        .chart-placeholder {
            width: 100%;
            height: 300px;
            background: linear-gradient(to bottom, #93c5fd 0%, #93c5fd 40%, #8b5cf6 40%, #8b5cf6 60%, #d4a574 60%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
        }
        
        /* Wind rose chart placeholder */
        .wind-rose-placeholder {
            width: 100%;
            height: 400px;
            background: radial-gradient(circle, #fef3c7 30%, #fed7aa 60%, #fdba74 100%);
            border-radius: 50%;
            margin: 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #92400e;
            font-weight: bold;
            font-size: 16px;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
        }
        
        .data-table th {
            background: #f3f4f6;
            padding: 10px;
            border: 1px solid #d1d5db;
            font-weight: 600;
            text-align: left;
        }
        
        .data-table td {
            padding: 8px 10px;
            border: 1px solid #d1d5db;
        }
        
        .data-table tbody tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .photo-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        
        .photo-placeholder {
            height: 200px;
            background: #f3f4f6;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6b7280;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- SUMMARY PAGE -->
        <div class="page-break-avoid">
            <div class="report-header">
                <h1 class="report-title">${reportData.name}</h1>
                <p class="report-subtitle">GCSE Geography River Study Analysis</p>
            </div>
            
            <!-- KPI Cards -->
            <div class="kpi-grid page-break-avoid">
                <div class="kpi-card kpi-blue">
                    <div class="kpi-value">${totalSites}</div>
                    <div class="kpi-label">Total Sites</div>
                </div>
                <div class="kpi-card kpi-green">
                    <div class="kpi-value">${totalArea.toFixed(2)}</div>
                    <div class="kpi-label">Total Area (m²)</div>
                </div>
                <div class="kpi-card kpi-purple">
                    <div class="kpi-value">${avgVelocity.toFixed(2)}</div>
                    <div class="kpi-label">Avg Velocity (m/s)</div>
                </div>
                <div class="kpi-card kpi-orange">
                    <div class="kpi-value">${totalDischarge.toFixed(2)}</div>
                    <div class="kpi-label">Total Discharge (m³/s)</div>
                </div>
            </div>
            
            <!-- Study Information -->
            <div class="study-info page-break-avoid">
                <h3>Study Information</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span><strong>Date:</strong></span>
                        <span>${formatDate(reportData.date)}</span>
                    </div>
                    <div class="info-item">
                        <span><strong>Location:</strong></span>
                        <span>${reportData.county ? reportData.county + ', ' : ''}${reportData.country || 'UK'}</span>
                    </div>
                    <div class="info-item">
                        <span><strong>Total Sites:</strong></span>
                        <span>${totalSites}</span>
                    </div>
                    <div class="info-item">
                        <span><strong>Study Type:</strong></span>
                        <span>River Cross-section Analysis</span>
                    </div>
                </div>
                ${reportData.notes ? `<p style="margin: 15px 0 0 0; padding: 15px; background: #f1f5f9; border-radius: 6px; border-left: 4px solid #3b82f6;"><strong>Notes:</strong> ${reportData.notes}</p>` : ''}
            </div>
        </div>

        ${sitesData.length > 0 ? `
        <!-- CROSS-SECTIONAL AREA SUMMARY -->
        <div class="page-break-before">
            <h2 class="section-header">Cross-Sectional Area Summary</h2>
            <table class="summary-table table-blue page-break-avoid">
                <thead>
                    <tr>
                        <th>Measurement</th>
                        ${sitesData.map(site => `<th>Site ${site.site_number}</th>`).join('')}
                        <th class="summary-col">Summary</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Width (m)</strong></td>
                        ${sitesData.map(site => `<td>${site.river_width}</td>`).join('')}
                        <td class="summary-col"><strong>${(sitesData.reduce((sum, site) => sum + site.river_width, 0) / sitesData.length).toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Average Depth (m)</strong></td>
                        ${sitesData.map(site => `<td>${calculateAverageDepth(site).toFixed(2)}</td>`).join('')}
                        <td class="summary-col"><strong>${(sitesData.reduce((sum, site) => sum + calculateAverageDepth(site), 0) / sitesData.length).toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Cross-Sectional Area (m²)</strong></td>
                        ${sitesData.map(site => `<td>${calculateCrossSectionalArea(site).toFixed(2)}</td>`).join('')}
                        <td class="summary-col"><strong>${totalArea.toFixed(2)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- VELOCITY SUMMARY -->
        <div class="page-break-avoid" style="margin-top: 40px;">
            <h2 class="section-header">Velocity Summary</h2>
            <table class="summary-table table-green page-break-avoid">
                <thead>
                    <tr>
                        <th>Measurement</th>
                        ${sitesData.map(site => `<th>Site ${site.site_number}</th>`).join('')}
                        <th class="summary-col">Summary</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Velocity (m/s)</strong></td>
                        ${sitesData.map(site => `<td>${calculateAverageVelocity(site).toFixed(2)}</td>`).join('')}
                        <td class="summary-col"><strong>${avgVelocity.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Discharge (m³/s)</strong></td>
                        ${sitesData.map(site => `<td>${calculateDischarge(site).toFixed(2)}</td>`).join('')}
                        <td class="summary-col"><strong>${totalDischarge.toFixed(2)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- SEDIMENT ANALYSIS SUMMARY -->
        <div class="page-break-avoid" style="margin-top: 40px;">
            <h2 class="section-header">Sediment Analysis Summary</h2>
            <table class="summary-table table-amber page-break-avoid">
                <thead>
                    <tr>
                        <th>Measurement</th>
                        ${sitesData.map(site => `<th>Site ${site.site_number}</th>`).join('')}
                        <th class="summary-col">Summary</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Sediment Size Average (mm)</strong></td>
                        ${sitesData.map(site => `<td>${calculateAverageSedimentSize(site).toFixed(2)}</td>`).join('')}
                        <td class="summary-col"><strong>${sitesData.length > 0 ? (sitesData.reduce((sum, site) => sum + calculateAverageSedimentSize(site), 0) / sitesData.length).toFixed(2) : '0.00'}</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Sediment Shape Average</strong></td>
                        ${sitesData.map(site => `<td>${calculateAverageSedimentRoundness(site).toFixed(2)}</td>`).join('')}
                        <td class="summary-col"><strong>${sitesData.length > 0 ? (sitesData.reduce((sum, site) => sum + calculateAverageSedimentRoundness(site), 0) / sitesData.length).toFixed(2) : '0.00'}</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Spearman's Rank Correlation</strong></td>
                        ${sitesData.map(site => `<td>${calculateSpearmansRank(site).toFixed(3)}</td>`).join('')}
                        <td class="summary-col"><strong>${sitesData.length > 0 ? (sitesData.reduce((sum, site) => sum + calculateSpearmansRank(site), 0) / sitesData.length).toFixed(3) : '0.000'}</strong></td>
                    </tr>
                </tbody>
            </table>
            
            <!-- Wind Rose Chart Placeholder -->
            <div class="page-break-avoid" style="margin-top: 30px;">
                <h3 style="text-align: center; color: #92400e; margin-bottom: 20px;">Sediment Roundness Distribution (Wind Rose)</h3>
                <div class="wind-rose-placeholder">
                    Wind Rose Chart: Sediment Roundness Analysis
                </div>
            </div>
        </div>
        ` : ''}

        <!-- INDIVIDUAL SITE PAGES -->
        ${sitesData.length === 0 ? `
            <div class="page-break-before">
                <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
                    <h2 style="color: #9ca3af; margin-bottom: 20px;">No Site Data Available</h2>
                    <p style="font-size: 18px; margin-bottom: 10px;">No measurement sites recorded yet</p>
                    <p>Individual site analysis will appear here once measurement sites are added to this river walk.</p>
                </div>
            </div>
        ` : sitesData.map((site, index) => `
            <div class="site-page page-break-before">
                <!-- Site Header -->
                <div class="site-header">
                    <h1 class="site-title">Site ${site.site_number}</h1>
                    <div class="site-info-grid">
                        <div class="site-info-item">
                            <h4>River Width</h4>
                            <p>${site.river_width} meters</p>
                        </div>
                        <div class="site-info-item">
                            <h4>GPS Coordinates</h4>
                            <p>${site.latitude && site.longitude ? `${site.latitude.toFixed(6)}, ${site.longitude.toFixed(6)}` : 'Not recorded'}</p>
                        </div>
                        <div class="site-info-item">
                            <h4>Weather Conditions</h4>
                            <p>${site.weather_conditions || 'Not recorded'}</p>
                        </div>
                        <div class="site-info-item">
                            <h4>Land Use</h4>
                            <p>${site.land_use || 'Not recorded'}</p>
                        </div>
                        <div class="site-info-item">
                            <h4>Data Completeness</h4>
                            <p>${[(site.measurement_points?.length || 0) > 0, (site.velocity_data?.measurements?.length || 0) > 0, (site.sedimentation_data?.measurements?.length || 0) > 0].filter(Boolean).length}/3 sections complete</p>
                        </div>
                        <div class="site-info-item">
                            <h4>Site Name</h4>
                            <p>${site.site_name || `Site ${site.site_number}`}</p>
                        </div>
                    </div>
                    ${site.notes ? `<div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 6px; border-left: 4px solid #fbbf24;"><strong>Notes:</strong> ${site.notes}</div>` : ''}
                </div>

                <!-- Site Photography -->
                <div class="site-section page-break-avoid">
                    <h3>Site Photography</h3>
                    <div class="photo-grid">
                        <div class="photo-placeholder">
                            ${site.photo_url ? 'Primary Site Photo' : 'No primary site photo available'}
                        </div>
                        <div class="photo-placeholder">
                            ${site.sedimentation_photo_url ? 'Sediment Sample Photo' : 'No sediment sample photo available'}
                        </div>
                    </div>
                </div>

                <!-- Cross-Sectional Analysis -->
                <div class="site-section page-break-avoid">
                    <h3>Cross-Sectional Analysis</h3>
                    <div class="chart-placeholder">
                        River Cross-Section Profile Chart
                    </div>
                    
                    <div class="metric-grid">
                        <div class="metric-card">
                            <div class="metric-value">${site.river_width}</div>
                            <div class="metric-label">Width (m)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${calculateMaxDepth(site).toFixed(2)}</div>
                            <div class="metric-label">Max Depth (m)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${calculateAverageDepth(site).toFixed(2)}</div>
                            <div class="metric-label">Avg Depth (m)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${calculateCrossSectionalArea(site).toFixed(2)}</div>
                            <div class="metric-label">Area (m²)</div>
                        </div>
                    </div>

                    ${site.measurement_points && site.measurement_points.length > 0 ? `
                        <h4 style="margin: 25px 0 15px 0; color: #1e40af;">Raw Measurement Data</h4>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Point Number</th>
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
                    ` : '<p style="text-align: center; color: #6b7280; font-style: italic; padding: 20px;">No measurement points recorded for this site</p>'}
                </div>

                <!-- Velocity Analysis -->
                <div class="site-section page-break-avoid">
                    <h3>Velocity Analysis</h3>
                    <div class="metric-grid" style="grid-template-columns: repeat(3, 1fr);">
                        <div class="metric-card">
                            <div class="metric-value">${calculateAverageVelocity(site).toFixed(2)}</div>
                            <div class="metric-label">Average Velocity (m/s)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${calculateDischarge(site).toFixed(2)}</div>
                            <div class="metric-label">Discharge (m³/s)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${site.velocity_data?.measurements?.length || 0}</div>
                            <div class="metric-label">Measurements</div>
                        </div>
                    </div>

                    ${site.velocity_data?.measurements && site.velocity_data.measurements.length > 0 ? `
                        <h4 style="margin: 25px 0 15px 0; color: #1e40af;">Individual Velocity Measurements</h4>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Measurement #</th>
                                    <th>Time (s)</th>
                                    <th>Distance (m)</th>
                                    <th>Velocity (m/s)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${site.velocity_data.measurements.map((measurement, idx) => `
                                    <tr>
                                        <td>${measurement.measurement_number}</td>
                                        <td>${measurement.time_seconds.toFixed(2)}</td>
                                        <td>${measurement.float_travel_distance.toFixed(2)}</td>
                                        <td>${measurement.velocity_ms.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p style="text-align: center; color: #6b7280; font-style: italic; padding: 20px;">No velocity measurements recorded for this site</p>'}
                </div>

                <!-- Sediment Analysis -->
                <div class="site-section page-break-avoid">
                    <h3>Sediment Analysis</h3>
                    <div class="metric-grid">
                        <div class="metric-card">
                            <div class="metric-value">${calculateAverageSedimentSize(site).toFixed(2)}</div>
                            <div class="metric-label">Average Size (mm)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${calculateAverageSedimentRoundness(site).toFixed(2)}</div>
                            <div class="metric-label">Average Roundness</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${calculateSpearmansRank(site).toFixed(3)}</div>
                            <div class="metric-label">Spearman's Rank</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${site.sedimentation_data?.measurements?.length || 0}</div>
                            <div class="metric-label">Sample Count</div>
                        </div>
                    </div>

                    ${site.sedimentation_data?.measurements && site.sedimentation_data.measurements.length > 0 ? `
                        <h4 style="margin: 25px 0 15px 0; color: #1e40af;">Individual Sediment Measurements</h4>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Sample #</th>
                                    <th>Size (mm)</th>
                                    <th>Size Category</th>
                                    <th>Roundness</th>
                                    <th>Shape Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${site.sedimentation_data.measurements.map((measurement, idx) => `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td>${measurement.sediment_size.toFixed(2)}</td>
                                        <td>${measurement.sediment_size < 0.063 ? 'Silt/Clay' : measurement.sediment_size < 2 ? 'Sand' : measurement.sediment_size < 64 ? 'Gravel' : 'Cobble'}</td>
                                        <td>${measurement.sediment_roundness.toFixed(1)}</td>
                                        <td>${getSedimentRoundnessDescription(measurement.sediment_roundness)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                            <strong>Correlation Interpretation:</strong>
                            ${calculateSpearmansRank(site) > 0.7 ? 'Strong positive correlation between size and roundness' :
                              calculateSpearmansRank(site) > 0.3 ? 'Moderate positive correlation between size and roundness' :
                              calculateSpearmansRank(site) > -0.3 ? 'Weak or no correlation between size and roundness' :
                              calculateSpearmansRank(site) > -0.7 ? 'Moderate negative correlation between size and roundness' :
                              'Strong negative correlation between size and roundness'}
                        </div>
                    ` : '<p style="text-align: center; color: #6b7280; font-style: italic; padding: 20px;">No sediment measurements recorded for this site</p>'}
                </div>
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
    console.log('🔍 Fetching real data with authentication for river walk ID:', riverWalkId);
    
    // Create authenticated Supabase client
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    console.log('🔑 Auth token present:', !!authToken);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      }
    });
    
    // Fetch river walk data
    const { data: riverWalk, error: riverWalkError } = await supabase
      .from('river_walks')
      .select('*')
      .eq('id', riverWalkId)
      .maybeSingle();

    console.log('📊 River walk query result:', { riverWalk, riverWalkError });

    // Fetch sites with authentication
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select(`
        *,
        measurement_points (*)
      `)
      .eq('river_walk_id', riverWalkId)
      .order('site_number', { ascending: true });

    console.log('📍 Sites query result:', { sitesCount: sites?.length || 0, sitesError });
    
    // Debug: log the actual site data structure
    if (sites && sites.length > 0) {
      const debugInfo = {
        site_number: sites[0].site_number,
        site_name: sites[0].site_name,
        river_width: sites[0].river_width,
        hasMeasurementPoints: !!sites[0].measurement_points,
        measurementPointsCount: sites[0].measurement_points?.length || 0,
        hasVelocityData: !!sites[0].velocity_data,
        velocityMeasurementsCount: sites[0].velocity_data?.measurements?.length || 0,
        velocityDataStructure: sites[0].velocity_data
      };
      console.log('🔍 First site data structure:', debugInfo);
      
      // Add debug info to response headers so we can see it in browser
      res.setHeader('X-Debug-Site-Info', JSON.stringify(debugInfo));
    }

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
        console.log('✅ Found', sites.length, 'real sites with data');
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