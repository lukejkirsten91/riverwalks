// pages/api/generate-pdf-puppeteer-remote.ts
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

// CSS Variables and Styles
const CSS_STYLES = `
:root {
  /* Color Palette */
  --clr-primary: #1e40af;
  --clr-cross-section: #3b82f6;
  --clr-cross-section-light: #dbeafe;
  --clr-cross-section-bg: #bfdbfe;
  --clr-velocity: #16a34a;
  --clr-velocity-light: #dcfce7;
  --clr-velocity-bg: #bbf7d0;
  --clr-sediment: #f59e0b;
  --clr-sediment-light: #fef3c7;
  --clr-sediment-bg: #fde68a;
  --clr-map: #dc2626;
  --clr-text: #1f2937;
  --clr-text-light: #6b7280;
  --clr-border: #e5e7eb;
  --clr-white: #ffffff;
  
  /* Spacing */
  --sp-xs: 4px;
  --sp-sm: 8px;
  --sp-md: 16px;
  --sp-lg: 24px;
  --sp-xl: 32px;
  --sp-2xl: 48px;
  
  /* Typography */
  --font-size-xs: 10px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 28px;
  --font-size-4xl: 32px;
}

@page {
  margin: 15mm 12mm;
  size: A4;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  color: var(--clr-text);
  background: var(--clr-white);
  margin: 0;
  padding: var(--sp-lg);
  font-variant-numeric: tabular-nums;
}

/* Header Template Styles */
.pdf-header {
  font-size: var(--font-size-xs);
  color: var(--clr-text-light);
  width: 100%;
  text-align: center;
  border-bottom: 1px solid var(--clr-border);
  padding-bottom: var(--sp-xs);
}

.pdf-footer {
  font-size: var(--font-size-xs);
  color: var(--clr-text-light);
  width: 100%;
  text-align: center;
  border-top: 1px solid var(--clr-border);
  padding-top: var(--sp-xs);
}

/* Print-friendly grayscale override */
@media print {
  /* Fix cover page overflow by removing body padding during print */
  body {
    padding: 0;
  }
  
  /* Ensure cover page uses full viewport height without overflow */
  .cover-page {
    min-height: 100vh;
    page-break-after: always;
  }
  
  .print-bw {
    --clr-cross-section: #4a5568;
    --clr-cross-section-light: #f7fafc;
    --clr-cross-section-bg: #e2e8f0;
    --clr-velocity: #2d3748;
    --clr-velocity-light: #f7fafc;
    --clr-velocity-bg: #e2e8f0;
    --clr-sediment: #1a202c;
    --clr-sediment-light: #f7fafc;
    --clr-sediment-bg: #e2e8f0;
    --clr-map: #2d3748;
  }
}

/* Semantic Structure */
.report-container {
  max-width: 210mm;
  margin: 0 auto;
}

.cover-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  page-break-after: always;
}

.toc {
  page-break-after: always;
}

/* Page break utilities for proper layout */
.page-break-before {
  page-break-before: always;
}

.page-break-after {
  page-break-after: always;
}

.page-break-avoid {
  page-break-inside: avoid;
}

/* Keep headers with their content */
.section-with-content {
  page-break-inside: avoid;
}

.section-header {
  page-break-after: avoid;
  page-break-inside: avoid;
}

/* Ensure figures don't break */
.figure {
  page-break-inside: avoid;
  page-break-after: avoid;
}

/* Site sections should stay together */
.site-section {
  page-break-inside: avoid;
}

.toc-title {
  font-size: var(--font-size-2xl);
  font-weight: bold;
  color: var(--clr-primary);
  margin-bottom: var(--sp-xl);
  border-bottom: 2px solid var(--clr-primary);
  padding-bottom: var(--sp-md);
}

.toc-entry {
  display: flex;
  justify-content: space-between;
  padding: var(--sp-sm) 0;
  border-bottom: 1px dotted var(--clr-border);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-lg);
  margin: var(--sp-xl) 0;
}

.kpi-card {
  padding: var(--sp-lg);
  border-radius: var(--sp-sm);
  text-align: center;
  border: 1px solid var(--clr-border);
}

.kpi-blue { background: var(--clr-cross-section-light); border-color: var(--clr-cross-section); }
.kpi-green { background: var(--clr-velocity-light); border-color: var(--clr-velocity); }
.kpi-purple { background: #f3e8ff; border-color: #a855f7; }
.kpi-orange { background: #fed7aa; border-color: #f97316; }

.kpi-value {
  font-size: var(--font-size-2xl);
  font-weight: bold;
  margin: 0 0 var(--sp-xs) 0;
}

.kpi-blue .kpi-value { color: var(--clr-cross-section); }
.kpi-green .kpi-value { color: var(--clr-velocity); }
.kpi-purple .kpi-value { color: #9333ea; }
.kpi-orange .kpi-value { color: #ea580c; }

.kpi-label {
  font-size: var(--font-size-sm);
  color: var(--clr-text-light);
  margin: 0;
}

.study-info {
  background: #f8fafc;
  padding: var(--sp-xl);
  border-radius: var(--sp-sm);
  margin: var(--sp-xl) 0;
  border: 1px solid var(--clr-border);
}

.study-info h3 {
  margin: 0 0 var(--sp-md) 0;
  color: var(--clr-primary);
  font-size: var(--font-size-lg);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-md);
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--sp-xl) 0;
  font-size: var(--font-size-sm);
  background: var(--clr-white);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.summary-table th {
  padding: var(--sp-sm);
  text-align: center;
  font-weight: 600;
  font-size: var(--font-size-xs);
  border: 1px solid var(--clr-border);
}

.summary-table td {
  padding: var(--sp-sm);
  text-align: center;
  border: 1px solid var(--clr-border);
}

.cross-section-theme th { background: var(--clr-cross-section-light); color: var(--clr-primary); }
.velocity-theme th { background: var(--clr-velocity-light); color: var(--clr-velocity); }
.sediment-theme th { background: var(--clr-sediment-light); color: var(--clr-sediment); }

.cross-section-theme .summary-col { background: var(--clr-cross-section-bg); }
.velocity-theme .summary-col { background: var(--clr-velocity-bg); }
.sediment-theme .summary-col { background: var(--clr-sediment-bg); }

.cross-section-section { 
  border-left: 4px solid var(--clr-cross-section); 
  background: linear-gradient(to right, var(--clr-cross-section-light), #f8fafc);
}
.velocity-section { 
  border-left: 4px solid var(--clr-velocity); 
  background: linear-gradient(to right, var(--clr-velocity-light), #f8fafc);
}
.sediment-section { 
  border-left: 4px solid var(--clr-sediment); 
  background: linear-gradient(to right, var(--clr-sediment-light), #f8fafc);
}

.cross-section-header { 
  color: var(--clr-primary); 
  border-bottom: 2px solid var(--clr-cross-section); 
  background: var(--clr-cross-section-light);
  padding: var(--sp-md);
  margin: calc(-1 * var(--sp-xl)) calc(-1 * var(--sp-xl)) var(--sp-lg) calc(-1 * var(--sp-xl));
}
.velocity-header { 
  color: var(--clr-velocity); 
  border-bottom: 2px solid var(--clr-velocity); 
  background: var(--clr-velocity-light);
  padding: var(--sp-md);
  margin: calc(-1 * var(--sp-xl)) calc(-1 * var(--sp-xl)) var(--sp-lg) calc(-1 * var(--sp-xl));
}
.sediment-header { 
  color: var(--clr-sediment); 
  border-bottom: 2px solid var(--clr-sediment); 
  background: var(--clr-sediment-light);
  padding: var(--sp-md);
  margin: calc(-1 * var(--sp-xl)) calc(-1 * var(--sp-xl)) var(--sp-lg) calc(-1 * var(--sp-xl));
}

.section-header {
  font-size: var(--font-size-2xl);
  font-weight: bold;
  color: var(--clr-primary);
  margin: var(--sp-2xl) 0 var(--sp-lg) 0;
  padding-bottom: var(--sp-md);
  border-bottom: 2px solid var(--clr-primary);
}

.site-page {
  min-height: 100vh;
  page-break-before: always;
}

.site-header {
  background: linear-gradient(135deg, var(--clr-cross-section), var(--clr-primary));
  color: var(--clr-white);
  padding: var(--sp-xl);
  border-radius: var(--sp-md);
  margin-bottom: var(--sp-xl);
}

.site-title {
  font-size: var(--font-size-3xl);
  font-weight: bold;
  margin: 0 0 var(--sp-lg) 0;
}

.site-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-lg);
}

.site-info-item h4 {
  margin: 0 0 var(--sp-xs) 0;
  font-size: var(--font-size-sm);
  opacity: 0.9;
}

.site-info-item p {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
}

.site-section {
  margin: var(--sp-xl) 0;
  padding: var(--sp-xl);
  background: var(--clr-white);
  border-radius: var(--sp-sm);
  border: 1px solid var(--clr-border);
  page-break-inside: avoid;
}

.site-section h3 {
  margin: 0 0 var(--sp-lg) 0;
  font-size: var(--font-size-xl);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-md);
  margin: var(--sp-lg) 0;
}

.metric-card {
  text-align: center;
  padding: var(--sp-md);
  background: #f8fafc;
  border-radius: var(--sp-xs);
  border: 1px solid var(--clr-border);
}

.metric-value {
  font-size: var(--font-size-xl);
  font-weight: bold;
  color: var(--clr-primary);
  margin: 0 0 var(--sp-xs) 0;
}

.metric-label {
  font-size: var(--font-size-xs);
  color: var(--clr-text-light);
  margin: 0;
}

.chart-container svg {
  max-width: 100%;
  height: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--sp-lg) 0;
  font-size: var(--font-size-sm);
}

.data-table th {
  background: #f3f4f6;
  padding: var(--sp-md);
  border: 1px solid var(--clr-border);
  font-weight: 600;
  text-align: left;
}

.data-table td {
  padding: var(--sp-sm) var(--sp-md);
  border: 1px solid var(--clr-border);
}

.data-table tbody tr:nth-child(even) {
  background: #f9fafb;
}

.photo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-lg);
  margin: var(--sp-lg) 0;
}

.photo-container {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xs);
}

.photo-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: var(--sp-sm);
  border: 1px solid var(--clr-border);
}

.photo-caption {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--clr-text-light);
  font-style: italic;
}

.photo-placeholder {
  height: 200px;
  background: #f3f4f6;
  border: 2px dashed var(--clr-border);
  border-radius: var(--sp-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--clr-text-light);
  font-style: italic;
}

/* Figure captions */
.figure {
  margin: var(--sp-lg) 0;
  text-align: center;
}

.figure-caption {
  font-size: var(--font-size-sm);
  color: var(--clr-text-light);
  margin-top: var(--sp-sm);
  font-style: italic;
}

/* Units styling */
.unit {
  font-variant: normal;
}

.unit-sup {
  vertical-align: super;
  font-size: 0.75em;
}

.unit-sub {
  vertical-align: sub;
  font-size: 0.75em;
}
`;

// Modular render functions for cleaner code organization
function renderCoverPage(reportData: any, totalSites: number, formatDate: Function) {
  return `
    <header class="cover-page">
        <h1 style="font-size: var(--font-size-4xl); color: var(--clr-primary); margin-bottom: var(--sp-lg);">${reportData.name}</h1>
        <h2 style="font-size: var(--font-size-xl); color: var(--clr-text-light); margin-bottom: var(--sp-2xl);">GCSE Geography River Study Analysis</h2>
        
        <div style="margin: var(--sp-2xl) 0;">
            <p style="font-size: var(--font-size-lg); margin: var(--sp-md) 0;"><strong>Study Date:</strong> ${formatDate(reportData.date)}</p>
            <p style="font-size: var(--font-size-lg); margin: var(--sp-md) 0;"><strong>Location:</strong> ${reportData.county ? reportData.county + ', ' : ''}${reportData.country || 'UK'}</p>
            <p style="font-size: var(--font-size-lg); margin: var(--sp-md) 0;"><strong>Total Sites:</strong> ${totalSites}</p>
        </div>
        
        <div style="position: absolute; bottom: var(--sp-2xl); left: 50%; transform: translateX(-50%); text-align: center;">
            <p style="font-size: var(--font-size-sm); color: var(--clr-text-light); margin: 0;">Generated on ${formatDate(new Date().toISOString())}</p>
        </div>
    </header>
  `;
}

function renderTableOfContents(tocEntries: any[]) {
  return `
    <section class="toc">
        <h1 class="toc-title">Table of Contents</h1>
        ${tocEntries.map(entry => `
            <div class="toc-entry">
                <span>${entry.title}</span>
                <span>Page ${entry.page}</span>
            </div>
        `).join('')}
    </section>
  `;
}

function renderExecutiveSummary(reportData: any, totalSites: number, totalArea: number, avgVelocity: number, totalDischarge: number, sitesData: any[], formatDate: Function, formatUnitWithSuperscript: Function, formatUnit: Function, generateMapSVG: Function, getNextFigureNumber: Function) {
  return `
    <section>
        <header>
            <h1 style="font-size: var(--font-size-3xl); color: var(--clr-primary); text-align: center; margin-bottom: var(--sp-2xl); border-bottom: 3px solid var(--clr-primary); padding-bottom: var(--sp-md);">Executive Summary</h1>
        </header>
        
        <!-- KPI Cards -->
        <section class="kpi-grid page-break-avoid">
            <article class="kpi-card kpi-blue">
                <div class="kpi-value">${totalSites}</div>
                <div class="kpi-label">Total Sites</div>
            </article>
            <article class="kpi-card kpi-green">
                <div class="kpi-value">${formatUnitWithSuperscript(totalArea, 'm', '2')}</div>
                <div class="kpi-label">Total Area</div>
            </article>
            <article class="kpi-card kpi-purple">
                <div class="kpi-value">${formatUnit(avgVelocity, 'm/s')}</div>
                <div class="kpi-label">Avg Velocity</div>
            </article>
            <article class="kpi-card kpi-orange">
                <div class="kpi-value">${formatUnitWithSuperscript(totalDischarge, 'm', '3')}/s</div>
                <div class="kpi-label">Total Discharge</div>
            </article>
        </section>
        
        <!-- Study Information -->
        <section class="study-info page-break-avoid">
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
            ${reportData.notes ? `<p style="margin: var(--sp-md) 0 0 0; padding: var(--sp-md); background: #f1f5f9; border-radius: var(--sp-xs); border-left: 4px solid var(--clr-cross-section);"><strong>Notes:</strong> ${reportData.notes}</p>` : ''}
        </section>

        <!-- Methodology -->
        <section class="study-info page-break-avoid" style="background: #f0f9ff;">
            <h3 style="color: var(--clr-cross-section);">Methodology</h3>
            <div style="font-size: var(--font-size-sm); line-height: 1.6;">
                <p><strong>Equipment:</strong> Measuring tape, depth probe, flow meter, digital calipers, GPS device</p>
                <p><strong>Sampling Method:</strong> Systematic point measurements across river width at ${totalSites} representative sites</p>
                <p><strong>Measurements:</strong> Cross-sectional profile, velocity at 0.6 depth, sediment size and roundness</p>
                <p><strong>Data Processing:</strong> Statistical analysis including Spearman's rank correlation for sediment relationships</p>
            </div>
        </section>

        <!-- Site Location Map -->
        <section class="page-break-avoid" style="margin-top: var(--sp-xl);">
            <h2 class="section-header" style="color: var(--clr-map); border-bottom-color: var(--clr-map); text-align: center; margin-bottom: var(--sp-lg);">Site Location Map</h2>
            <figure class="figure">
                ${generateMapSVG(sitesData)}
                <figcaption class="figure-caption">Figure ${getNextFigureNumber()}: Location map showing measurement sites and inter-site distances</figcaption>
            </figure>
        </section>
    </section>
  `;
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
    if (!site.sedimentation_data || !site.sedimentation_data.measurements || site.sedimentation_data.measurements.length === 0) return null;
    const totalSize = site.sedimentation_data.measurements.reduce((sum: number, measurement: any) => sum + measurement.sediment_size, 0);
    return totalSize / site.sedimentation_data.measurements.length;
  };

  const calculateAverageSedimentRoundness = (site: any) => {
    if (!site.sedimentation_data || !site.sedimentation_data.measurements || site.sedimentation_data.measurements.length === 0) return null;
    const totalRoundness = site.sedimentation_data.measurements.reduce((sum: number, measurement: any) => sum + measurement.sediment_roundness, 0);
    return totalRoundness / site.sedimentation_data.measurements.length;
  };

  const calculateSpearmansRank = (site: any) => {
    if (!site.sedimentation_data || !site.sedimentation_data.measurements || site.sedimentation_data.measurements.length < 3) return null;
    
    const measurements = site.sedimentation_data.measurements;
    const n = measurements.length;
    
    // Rank the size measurements
    const sizeRanks = measurements
      .map((m: any, i: number) => ({ value: m.sediment_size, index: i }))
      .sort((a: any, b: any) => a.value - b.value)
      .map((item: any, rank: number) => ({ index: item.index, rank: rank + 1 }))
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => item.rank);
    
    // Rank the roundness measurements
    const roundnessRanks = measurements
      .map((m: any, i: number) => ({ value: m.sediment_roundness, index: i }))
      .sort((a: any, b: any) => a.value - b.value)
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

  // Helper functions to format values with N/A handling
  const formatSpearmanValue = (site: any) => {
    const value = calculateSpearmansRank(site);
    return value !== null ? value.toFixed(3) : 'N/A';
  };

  const formatSedimentSizeValue = (site: any) => {
    const value = calculateAverageSedimentSize(site);
    return value !== null ? value.toFixed(2) : 'N/A';
  };

  const formatSedimentRoundnessValue = (site: any) => {
    const value = calculateAverageSedimentRoundness(site);
    return value !== null ? value.toFixed(2) : 'N/A';
  };

  const calculateValidSpearmanAverage = (sites: any[]) => {
    const validValues = sites.map(site => calculateSpearmansRank(site)).filter(value => value !== null);
    return validValues.length > 0 ? (validValues.reduce((sum, value) => sum + value, 0) / validValues.length).toFixed(3) : 'N/A';
  };

  const calculateValidSedimentSizeAverage = (sites: any[]) => {
    const validValues = sites.map(site => calculateAverageSedimentSize(site)).filter(value => value !== null);
    return validValues.length > 0 ? (validValues.reduce((sum, value) => sum + value, 0) / validValues.length).toFixed(2) : 'N/A';
  };

  const calculateValidSedimentRoundnessAverage = (sites: any[]) => {
    const validValues = sites.map(site => calculateAverageSedimentRoundness(site)).filter(value => value !== null);
    return validValues.length > 0 ? (validValues.reduce((sum, value) => sum + value, 0) / validValues.length).toFixed(2) : 'N/A';
  };

  const getSedimentRoundnessDescription = (roundness: number) => {
    if (roundness >= 5.5) return 'Very Angular';
    if (roundness >= 4.5) return 'Angular';
    if (roundness >= 3.5) return 'Sub-Angular';
    if (roundness >= 2.5) return 'Sub-Rounded';
    if (roundness >= 1.5) return 'Rounded';
    return 'Very Rounded';
  };

  // Utility functions for number formatting and units with consistent significant figures
  const formatNumber = (value: number, decimals: number = 2): string => {
    return value.toLocaleString('en-GB', { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    });
  };

  const formatSignificantFigures = (value: number, sigFigs: number = 3): string => {
    if (value === 0) return '0.00';
    const magnitude = Math.floor(Math.log10(Math.abs(value)));
    const decimals = Math.max(0, sigFigs - magnitude - 1);
    return value.toLocaleString('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatUnit = (value: number, unit: string, decimals: number = 2): string => {
    const formattedValue = formatNumber(value, decimals);
    return `${formattedValue}<span class="unit">${unit}</span>`;
  };

  const formatUnitWithSuperscript = (value: number, baseUnit: string, superscript: string, decimals: number = 2): string => {
    const formattedValue = formatNumber(value, decimals);
    return `${formattedValue}<span class="unit">${baseUnit}<span class="unit-sup">${superscript}</span></span>`;
  };

  // Figure counter for numbered captions
  let figureCounter = 0;
  const getNextFigureNumber = () => ++figureCounter;

  // Page calculation for TOC
  let pageCounter = 1;
  const getPageNumber = () => pageCounter++;
  
  // Reset page counter
  pageCounter = 1;
  
  // Cover page = 1, TOC = 2, Summary = 3, Data tables = 4+, Sites start after that
  const coverPage = getPageNumber();
  const tocPage = getPageNumber(); 
  const summaryPage = getPageNumber();
  const dataTablesStartPage = getPageNumber();
  const sitesStartPage = dataTablesStartPage + (sitesData.length > 0 ? 3 : 0); // 3 pages for data tables
  
  // TOC entries
  const tocEntries = [
    { title: 'Executive Summary', page: summaryPage },
    ...(sitesData.length > 0 ? [
      { title: 'Cross-Sectional Area Analysis', page: dataTablesStartPage },
      { title: 'Velocity Analysis', page: dataTablesStartPage + 1 },
      { title: 'Sediment Analysis', page: dataTablesStartPage + 2 }
    ] : []),
    ...sitesData.map((site, index) => ({
      title: `Site ${site.site_number} Analysis`,
      page: sitesStartPage + index
    }))
  ];

  // Calculate distance between two GPS coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Return distance in meters
  };

  // Generate SVG map with GPS markers and distance labels (matching frontend)
  const generateMapSVG = (sites: any[]) => {
    const sitesWithGPS = sites.filter(site => site.latitude && site.longitude);
    
    if (sitesWithGPS.length === 0) {
      return '<div style="text-align: center; color: #6b7280; padding: 40px; display: flex; flex-direction: column; align-items: center;"><div style="width: 48px; height: 48px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">📍</div><p>No GPS coordinates available</p><p style="font-size: 14px; color: #9ca3af;">Add site coordinates to display location map</p></div>';
    }

    const width = 600;
    const height = 400;

    // Calculate center and bounds (exact frontend logic)
    const lats = sitesWithGPS.map(site => site.latitude);
    const lons = sitesWithGPS.map(site => site.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    // Add 10% padding (frontend logic)
    const latPadding = (maxLat - minLat) * 0.1 || 0.001;
    const lonPadding = (maxLon - minLon) * 0.1 || 0.001;
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLon + maxLon) / 2;

    // Calculate zoom level (frontend logic)
    const latDiff = maxLat - minLat + 2 * latPadding;
    const lonDiff = maxLon - minLon + 2 * lonPadding;
    const maxDiff = Math.max(latDiff, lonDiff);
    const zoom = Math.min(15, Math.max(8, Math.round(14 - Math.log2(maxDiff * 100))));

    // Google Maps Static API URL - use environment variable only
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!googleMapsApiKey) {
      // Return a simple text-based map placeholder when API key is not available
      return `
        <div style="width: 600px; height: 400px; border: 2px dashed #e5e7eb; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f9fafb; color: #6b7280; text-align: center; padding: 40px;">
          <div style="font-size: 24px; margin-bottom: 16px;">🗺️</div>
          <h3 style="margin: 0 0 8px 0; color: #374151;">Site Location Map</h3>
          <p style="margin: 0; font-size: 14px;">GPS coordinates: ${sitesWithGPS.length} sites recorded</p>
          <p style="margin: 8px 0 0 0; font-size: 12px;">Map display requires API configuration</p>
        </div>
      `;
    }
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=${zoom}&size=600x400&maptype=roadmap&style=feature:poi|visibility:off&style=feature:transit|visibility:off&style=feature:administrative.locality|element:labels|visibility:simplified&style=feature:landscape|color:0xf2f2f2&style=feature:water|color:0xb3d1ff&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;

    // Calculate scaling for SVG overlay (frontend logic)
    const scaleX = width / (lonDiff);
    const scaleY = height / (latDiff);
    
    const xScale = (lon: number) => (lon - (centerLng - lonDiff/2)) * scaleX;
    const yScale = (lat: number) => height - (lat - (centerLat - latDiff/2)) * scaleY;

    // Generate connection lines with distance labels (frontend colors)
    const connections = sitesWithGPS.slice(0, -1).map((site, index) => {
      const nextSite = sitesWithGPS[index + 1];
      const distance = calculateDistance(site.latitude, site.longitude, nextSite.latitude, nextSite.longitude);
      
      const x1 = xScale(site.longitude);
      const y1 = yScale(site.latitude);
      const x2 = xScale(nextSite.longitude);
      const y2 = yScale(nextSite.latitude);
      
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      
      return {
        line: `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#dc2626" stroke-width="3" stroke-dasharray="8,4" stroke-linecap="round"/>`,
        label: `<rect x="${midX - 20}" y="${midY - 12}" width="40" height="16" fill="white" fill-opacity="0.9" stroke="#dc2626" stroke-width="1" rx="4"/>
                <text x="${midX}" y="${midY - 2}" text-anchor="middle" font-size="9" fill="#dc2626" font-weight="bold">${distance.toFixed(0)}m</text>`
      };
    });

    // Generate site markers (exact frontend styling)
    const markers = sitesWithGPS.map((site, index) => {
      const x = xScale(site.longitude);
      const y = yScale(site.latitude);
      
      return `
        <!-- Shadow -->
        <circle cx="${x + 1}" cy="${y + 1}" r="15" fill="rgba(0,0,0,0.2)"/>
        
        <!-- Site marker -->
        <circle cx="${x}" cy="${y}" r="15" fill="#dc2626" stroke="#ffffff" stroke-width="3"/>
        <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" fill="white" font-weight="bold">${site.site_number}</text>
        
        <!-- Site label -->
        <rect x="${x - 30}" y="${y - 45}" width="60" height="20" fill="white" fill-opacity="0.9" stroke="#dc2626" stroke-width="1" rx="4"/>
        <text x="${x}" y="${y - 32}" text-anchor="middle" font-size="10" fill="#dc2626" font-weight="bold">Site ${site.site_number}</text>
      `;
    });

    // Scale calculation (frontend logic)
    const scaleDistance = (50 / scaleX * 111320).toFixed(0);

    return `
      <div style="position: relative; width: ${width}px; height: ${height}px; border: 1px solid #e5e7eb;">
        <!-- Google Maps Background -->
        <img src="${mapUrl}" width="${width}" height="${height}" style="position: absolute; top: 0; left: 0;" alt="Site Location Map" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
        
        <!-- Fallback background -->
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #f0f9ff; display: none; text-align: center; padding-top: 180px; color: #6b7280;">
          Map temporarily unavailable
        </div>
        
        <!-- SVG Overlay -->
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="position: absolute; top: 0; left: 0;">
          <!-- Flight path lines -->
          ${connections.map(conn => conn.line).join('')}
          
          <!-- Distance labels -->
          ${connections.map(conn => conn.label).join('')}
          
          <!-- Site markers -->
          ${markers.join('')}
          
          <!-- Compass rose (frontend position) -->
          <g transform="translate(550, 30)">
            <circle cx="0" cy="0" r="20" fill="white" stroke="#374151" stroke-width="1" fill-opacity="0.9"/>
            <path d="M 0,-15 L 5,0 L 0,5 L -5,0 Z" fill="#dc2626"/>
            <text x="0" y="-25" text-anchor="middle" font-size="8" fill="#374151" font-weight="bold">N</text>
          </g>
          
          <!-- Scale indicator (frontend style) -->
          <g transform="translate(20, ${height - 40})">
            <rect x="-5" y="-15" width="70" height="25" fill="white" fill-opacity="0.9" stroke="#374151" stroke-width="1" rx="4"/>
            <line x1="5" y1="0" x2="55" y2="0" stroke="#374151" stroke-width="2"/>
            <line x1="5" y1="-3" x2="5" y2="3" stroke="#374151" stroke-width="2"/>
            <line x1="55" y1="-3" x2="55" y2="3" stroke="#374151" stroke-width="2"/>
            <text x="30" y="-6" text-anchor="middle" font-size="8" fill="#374151" font-weight="bold">${scaleDistance}m</text>
          </g>
          
          <!-- Legend (frontend style) -->
          <g transform="translate(20, 40)">
            <rect x="-5" y="-15" width="140" height="50" fill="white" fill-opacity="0.9" stroke="#374151" stroke-width="1" rx="4"/>
            <text x="5" y="-5" font-size="9" fill="#374151" font-weight="bold">Legend:</text>
            <line x1="5" y1="5" x2="25" y2="5" stroke="#dc2626" stroke-width="3" stroke-dasharray="8,4"/>
            <text x="30" y="8" font-size="8" fill="#374151">Flight line</text>
            <circle cx="15" cy="20" r="8" fill="#dc2626" stroke="white" stroke-width="2"/>
            <text x="30" y="23" font-size="8" fill="#374151">Measurement site</text>
          </g>
        </svg>
      </div>
    `;
  };

  // Generate SVG cross-section chart for a site (improved scaling)
  const generateCrossSectionSVG = (site: any) => {
    if (!site.measurement_points || site.measurement_points.length === 0) {
      return '<div style="text-align: center; color: #6b7280; padding: 40px;">No measurement points available for cross-section chart</div>';
    }

    const points = site.measurement_points.sort((a: any, b: any) => a.point_number - b.point_number);
    const width = 600;
    const height = 400;
    const margin = { top: 80, right: 40, bottom: 80, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Calculate proper scaling to fit all elements
    const riverWidth = site.river_width;
    const depths = points.map((p: any) => p.depth);
    const maxDepth = Math.max(...depths);
    const minDepth = Math.min(...depths);
    
    // X range: extend slightly beyond river width
    const xRange = [-0.5, riverWidth + 0.5];
    
    // Y range: ensure all elements fit with proper padding
    const bankHeight = 0.5; // Height of banks above water
    const undergroundDepth = 0.5; // Underground extension below deepest point
    const widthIndicatorHeight = 0.3; // Space for width indicator
    const labelSpace = 0.2; // Space for depth labels
    
    const yMax = bankHeight + widthIndicatorHeight + labelSpace;
    const yMin = -(maxDepth + undergroundDepth);
    const yRange = [yMin, yMax];
    
    const xScale = (x: number) => ((x - xRange[0]) / (xRange[1] - xRange[0])) * chartWidth;
    const yScale = (y: number) => chartHeight - ((y - yRange[0]) / (yRange[1] - yRange[0])) * chartHeight;

    // Generate paths with proper scaling
    // 1. Brown underground area (extends below deepest point)
    const undergroundY = yMin;
    const undergroundPath = `M ${xScale(-0.5)} ${yScale(undergroundY)} 
                            L ${xScale(riverWidth + 0.5)} ${yScale(undergroundY)} 
                            L ${xScale(riverWidth + 0.5)} ${yScale(0)} 
                            L ${xScale(-0.5)} ${yScale(0)} Z`;

    // 2. Left bank
    const leftBankPath = `M ${xScale(-0.5)} ${yScale(bankHeight)} 
                         L ${xScale(0)} ${yScale(0)} 
                         L ${xScale(-0.5)} ${yScale(0)} Z`;

    // 3. Right bank  
    const rightBankPath = `M ${xScale(riverWidth)} ${yScale(0)} 
                          L ${xScale(riverWidth + 0.5)} ${yScale(bankHeight)} 
                          L ${xScale(riverWidth + 0.5)} ${yScale(0)} Z`;

    // 4. River bed (main profile) - create smooth path through measurement points
    const riverBedPoints = points.map((p: any) => `${xScale(p.distance_from_bank)},${yScale(-p.depth)}`);
    const riverBedPath = `M ${xScale(0)},${yScale(0)} 
                         L ${riverBedPoints.join(' L ')} 
                         L ${xScale(riverWidth)},${yScale(0)} Z`;

    // 5. Water surface line
    const waterSurfacePath = `M ${xScale(0)} ${yScale(0)} L ${xScale(riverWidth)} ${yScale(0)}`;

    // Width indicator (positioned above banks)
    const widthLineY = yScale(bankHeight + 0.1);
    const widthTickY1 = yScale(bankHeight + 0.05);
    const widthTickY2 = yScale(bankHeight + 0.15);

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: white;">
        <defs>
          <pattern id="grid-${site.site_number}" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="lightgray" stroke-width="0.5"/>
          </pattern>
        </defs>
        
        <!-- Plot background -->
        <rect width="${width}" height="${height}" fill="white"/>
        <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="lightcyan"/>
        
        <!-- Grid -->
        <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="url(#grid-${site.site_number})"/>
        
        <!-- Chart area -->
        <g transform="translate(${margin.left}, ${margin.top})">
          <!-- Clip path to contain all elements -->
          <defs>
            <clipPath id="chart-clip-${site.site_number}">
              <rect x="0" y="0" width="${chartWidth}" height="${chartHeight}"/>
            </clipPath>
          </defs>
          
          <g clip-path="url(#chart-clip-${site.site_number})">
            <!-- 1. Brown underground area -->
            <path d="${undergroundPath}" fill="peru" stroke="brown" stroke-width="0"/>
            
            <!-- 2. Left bank -->
            <path d="${leftBankPath}" fill="peru" stroke="brown" stroke-width="0"/>
            
            <!-- 3. Right bank -->
            <path d="${rightBankPath}" fill="peru" stroke="brown" stroke-width="0"/>
            
            <!-- 4. River bed (main profile) -->
            <path d="${riverBedPath}" fill="lightblue" stroke="royalblue" stroke-width="2"/>
            
            <!-- 5. Water surface line -->
            <path d="${waterSurfacePath}" stroke="lightblue" stroke-width="2"/>
            
            <!-- Measurement points (darkblue circles) -->
            ${points.map((p: any) => {
              const x = xScale(p.distance_from_bank);
              const y = yScale(-p.depth);
              return `<circle cx="${x}" cy="${y}" r="4" fill="darkblue" stroke="white" stroke-width="1"/>`;
            }).join('')}
          </g>
          
          <!-- Width indicator line (above clip area) -->
          <line x1="${xScale(0)}" y1="${widthLineY}" x2="${xScale(riverWidth)}" y2="${widthLineY}" stroke="black" stroke-width="2"/>
          <!-- Width indicator ticks -->
          <line x1="${xScale(0)}" y1="${widthTickY1}" x2="${xScale(0)}" y2="${widthTickY2}" stroke="black" stroke-width="2"/>
          <line x1="${xScale(riverWidth)}" y1="${widthTickY1}" x2="${xScale(riverWidth)}" y2="${widthTickY2}" stroke="black" stroke-width="2"/>
        </g>
        
        <!-- Annotations -->
        <!-- Depth labels at each measurement point -->
        ${points.map((p: any) => {
          const x = margin.left + xScale(p.distance_from_bank);
          const y = margin.top + yScale(-p.depth - 0.15); // Position above points
          return `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" fill="black" font-weight="bold">${p.depth}m</text>`;
        }).join('')}
        
        <!-- Width label -->
        <text x="${margin.left + xScale(riverWidth/2)}" y="${margin.top + yScale(bankHeight + 0.25)}" text-anchor="middle" font-size="12" fill="black" font-weight="bold">${riverWidth}m</text>
        
        <!-- Axis labels -->
        <text x="${width/2}" y="${height - 15}" text-anchor="middle" font-size="12" fill="black">Distance from Bank (m)</text>
        <text x="15" y="${height/2}" text-anchor="middle" font-size="12" fill="black" transform="rotate(-90, 15, ${height/2})">Depth (m)</text>
        
        <!-- Title -->
        <text x="${width/2}" y="25" text-anchor="middle" font-size="16" fill="black" font-weight="bold">Cross-Section: Site ${site.site_number}</text>
        
        <!-- Y-axis scale -->
        ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const yVal = yRange[0] + ratio * (yRange[1] - yRange[0]);
          const yPos = margin.top + yScale(yVal);
          return `<text x="${margin.left - 10}" y="${yPos + 4}" text-anchor="end" font-size="10" fill="black">${yVal.toFixed(1)}m</text>`;
        }).join('')}
        
        <!-- X-axis scale -->
        ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const xVal = xRange[0] + ratio * (xRange[1] - xRange[0]);
          const xPos = margin.left + xScale(xVal);
          return `<text x="${xPos}" y="${height - 45}" text-anchor="middle" font-size="10" fill="black">${xVal.toFixed(1)}m</text>`;
        }).join('')}
      </svg>
    `;
  };

  // Generate SVG wind rose chart for sediment roundness (exact frontend replication)
  const generateWindRoseSVG = (sites: any[]) => {
    const width = 600;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = 120;

    // Frontend roundness ranges and colors (per site)
    const roundnessRanges = ['1 - Very Angular', '2 - Angular', '3 - Sub Angular', '4 - Sub Rounded', '5 - Rounded', '6 - Well Rounded'];
    const thetas = [0, 60, 120, 180, 240, 300];
    const siteColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    if (sites.length === 0) {
      return '<div style="text-align: center; color: #6b7280; padding: 40px;">No site data available for wind rose chart</div>';
    }

    // Process data exactly like frontend
    const allSedimentData: any[] = [];
    sites.forEach((site, siteIndex) => {
      if (site.sedimentation_data?.measurements && site.sedimentation_data.measurements.length > 0) {
        // Count roundness for each category (1-6)
        const siteRoundnessCounts = [0, 0, 0, 0, 0, 0];
        
        site.sedimentation_data.measurements.forEach((measurement: any) => {
          const roundness = Math.round(measurement.sediment_roundness);
          const index = Math.max(0, Math.min(5, roundness - 1)); // Clamp to 0-5
          siteRoundnessCounts[index]++;
        });

        allSedimentData.push({
          siteNumber: site.site_number,
          counts: siteRoundnessCounts,
          color: siteColors[siteIndex % siteColors.length],
          siteIndex: siteIndex
        });
      }
    });

    if (allSedimentData.length === 0) {
      return '<div style="text-align: center; color: #6b7280; padding: 40px;">No sediment data available for wind rose chart</div>';
    }

    // Calculate radial scale (max count across all sites)
    const maxCount = Math.max(...allSedimentData.flatMap(site => site.counts)) + 1;

    // Generate polar bars for each site
    const polarBars = allSedimentData.map((siteData, layerIndex) => {
      return siteData.counts.map((count: number, angleIndex: number) => {
        if (count === 0) return '';

        const theta = thetas[angleIndex];
        const barRadius = (count / maxCount) * maxRadius;
        const innerRadius = 0; // Start from center
        
        // Convert to SVG coordinates (theta=0 is top, clockwise)
        const startAngle = (theta - 30) * Math.PI / 180;
        const endAngle = (theta + 30) * Math.PI / 180;

        // Calculate sector path
        const largeArcFlag = 60 > 180 ? 1 : 0;
        
        const x1 = centerX + Math.cos(startAngle) * innerRadius;
        const y1 = centerY + Math.sin(startAngle) * innerRadius;
        const x2 = centerX + Math.cos(startAngle) * barRadius;
        const y2 = centerY + Math.sin(startAngle) * barRadius;
        const x3 = centerX + Math.cos(endAngle) * barRadius;
        const y3 = centerY + Math.sin(endAngle) * barRadius;
        const x4 = centerX + Math.cos(endAngle) * innerRadius;
        const y4 = centerY + Math.sin(endAngle) * innerRadius;

        const sectorPath = `M ${x1} ${y1} 
                           L ${x2} ${y2} 
                           A ${barRadius} ${barRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} 
                           L ${x4} ${y4} 
                           A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1} Z`;

        return `<path d="${sectorPath}" 
                      fill="${siteData.color}" 
                      fill-opacity="0.6" 
                      stroke="${siteData.color}" 
                      stroke-width="3" 
                      stroke-opacity="1"/>`;
      }).join('');
    }).join('');

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: white;">
        <!-- Plot background -->
        <rect width="${width}" height="${height}" fill="white"/>
        
        <!-- Radial grid lines -->
        ${[0.25, 0.5, 0.75, 1].map(ratio => 
          `<circle cx="${centerX}" cy="${centerY}" r="${ratio * maxRadius}" 
                   fill="none" stroke="lightgray" stroke-width="0.5"/>`
        ).join('')}
        
        <!-- Angular grid lines -->
        ${thetas.map(theta => {
          const angle = theta * Math.PI / 180;
          const x = centerX + Math.cos(angle) * maxRadius;
          const y = centerY + Math.sin(angle) * maxRadius;
          return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" 
                        stroke="lightgray" stroke-width="0.5"/>`;
        }).join('')}
        
        <!-- Outer circle -->
        <circle cx="${centerX}" cy="${centerY}" r="${maxRadius}" 
                fill="none" stroke="black" stroke-width="1"/>
        
        <!-- Polar bars -->
        ${polarBars}
        
        <!-- Radial axis labels -->
        ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const r = ratio * maxRadius;
          const value = (ratio * maxCount).toFixed(0);
          return `<text x="${centerX + r + 5}" y="${centerY + 4}" 
                        font-size="10" fill="black">${value}</text>`;
        }).join('')}
        
        <!-- Angular axis labels -->
        ${roundnessRanges.map((label, i) => {
          const theta = thetas[i];
          const angle = theta * Math.PI / 180;
          const labelRadius = maxRadius + 20;
          const x = centerX + Math.cos(angle) * labelRadius;
          const y = centerY + Math.sin(angle) * labelRadius;
          
          // Split long labels
          const shortLabel = label.split(' - ')[1] || label;
          return `<text x="${x}" y="${y}" text-anchor="middle" 
                        font-size="9" fill="black">${shortLabel}</text>`;
        }).join('')}
        
        <!-- Legend -->
        <g transform="translate(20, 30)">
          ${allSedimentData.map((siteData, i) => `
            <g transform="translate(0, ${i * 20})">
              <rect x="0" y="-8" width="15" height="15" 
                    fill="${siteData.color}" fill-opacity="0.6"
                    stroke="${siteData.color}" stroke-width="3"/>
              <text x="22" y="2" font-size="10" fill="black">Site ${siteData.siteNumber}</text>
            </g>
          `).join('')}
        </g>
      </svg>
    `;
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
        ${CSS_STYLES}
    </style>
</head>
<body>
    <div class="report-container">
        ${renderCoverPage(reportData, totalSites, formatDate)}
        ${renderTableOfContents(tocEntries)}
        ${renderExecutiveSummary(reportData, totalSites, totalArea, avgVelocity, totalDischarge, sitesData, formatDate, formatUnitWithSuperscript, formatUnit, generateMapSVG, getNextFigureNumber)}

        ${sitesData.length > 0 ? `
        <!-- CROSS-SECTIONAL AREA SUMMARY -->
        <section class="page-break-before section-with-content">
            <h2 class="section-header cross-section-header">Cross-Sectional Area Summary</h2>
            <table class="summary-table cross-section-theme page-break-avoid">
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
        </section>

        <!-- VELOCITY SUMMARY -->
        <section class="page-break-avoid section-with-content" style="margin-top: var(--sp-xl);">
            <h2 class="section-header velocity-header">Velocity Summary</h2>
            <table class="summary-table velocity-theme page-break-avoid">
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
        </section>

        <!-- SEDIMENT ANALYSIS SUMMARY -->
        <section class="page-break-avoid section-with-content" style="margin-top: var(--sp-xl);">
            <h2 class="section-header sediment-header">Sediment Analysis Summary</h2>
            <table class="summary-table sediment-theme page-break-avoid">
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
                        ${sitesData.map(site => `<td>${formatSedimentSizeValue(site)}</td>`).join('')}
                        <td class="summary-col"><strong>${calculateValidSedimentSizeAverage(sitesData)}</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Sediment Shape Average</strong></td>
                        ${sitesData.map(site => `<td>${formatSedimentRoundnessValue(site)}</td>`).join('')}
                        <td class="summary-col"><strong>${calculateValidSedimentRoundnessAverage(sitesData)}</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Spearman's Rank Correlation</strong></td>
                        ${sitesData.map(site => `<td>${formatSpearmanValue(site)}</td>`).join('')}
                        <td class="summary-col"><strong>${calculateValidSpearmanAverage(sitesData)}</strong></td>
                    </tr>
                </tbody>
            </table>
            
            <!-- Wind Rose Chart -->
            <div class="section-with-content" style="margin-top: var(--sp-xl);">
                <h3 style="text-align: center; color: var(--clr-sediment); margin-bottom: var(--sp-lg);">Sediment Roundness Distribution</h3>
                <figure class="figure">
                    ${generateWindRoseSVG(sitesData)}
                    <figcaption class="figure-caption">Figure ${getNextFigureNumber()}: Wind rose chart showing sediment roundness distribution across all measurement sites</figcaption>
                </figure>
            </div>
        </section>
        ` : ''}

        <!-- INDIVIDUAL SITE PAGES -->
        ${sitesData.length === 0 ? `
            <section class="page-break-before">
                <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
                    <h2 style="color: #9ca3af; margin-bottom: 20px;">No Site Data Available</h2>
                    <p style="font-size: 18px; margin-bottom: 10px;">No measurement sites recorded yet</p>
                    <p>Individual site analysis will appear here once measurement sites are added to this river walk.</p>
                </div>
            </section>
        ` : sitesData.map((site, index) => `
            <article class="site-page page-break-before">
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
                <section class="site-section section-with-content">
                    <h3 class="section-header">Site Photography</h3>
                    <div class="photo-grid">
                        <div class="photo-container">
                            ${site.photo_url ? 
                              `<img src="${site.photo_url}" alt="Primary Site Photo" class="photo-image" style="width: 100%; height: 200px; object-fit: cover; border-radius: var(--sp-sm);" />
                               <div class="photo-caption">Primary Site Photo</div>` : 
                              `<div class="photo-placeholder">No primary site photo available</div>`
                            }
                        </div>
                        <div class="photo-container">
                            ${site.sedimentation_photo_url ? 
                              `<img src="${site.sedimentation_photo_url}" alt="Sediment Sample Photo" class="photo-image" style="width: 100%; height: 200px; object-fit: cover; border-radius: var(--sp-sm);" />
                               <div class="photo-caption">Sediment Sample Photo</div>` : 
                              `<div class="photo-placeholder">No sediment sample photo available</div>`
                            }
                        </div>
                    </div>
                </section>

                <!-- Cross-Sectional Analysis -->
                <section class="site-section cross-section-section section-with-content">
                    <h3 class="section-header cross-section-header">Cross-Sectional Analysis</h3>
                    <figure class="figure">
                        <div class="chart-container" style="display: flex; justify-content: center; margin: var(--sp-lg) 0;">
                            ${generateCrossSectionSVG(site)}
                        </div>
                        <figcaption class="figure-caption">Figure ${getNextFigureNumber()}: Cross-sectional profile for Site ${site.site_number} showing depth measurements across river width</figcaption>
                    </figure>
                    
                    <div class="metric-grid">
                        <div class="metric-card">
                            <div class="metric-value">${formatSignificantFigures(site.river_width)}</div>
                            <div class="metric-label">Width (m)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatSignificantFigures(calculateMaxDepth(site))}</div>
                            <div class="metric-label">Max Depth (m)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatSignificantFigures(calculateAverageDepth(site))}</div>
                            <div class="metric-label">Avg Depth (m)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatSignificantFigures(calculateCrossSectionalArea(site))}</div>
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
                </section>

                <!-- Velocity Analysis -->
                <section class="site-section velocity-section section-with-content">
                    <h3 class="section-header velocity-header">Velocity Analysis</h3>
                    <div class="metric-grid" style="grid-template-columns: repeat(3, 1fr);">
                        <div class="metric-card">
                            <div class="metric-value">${formatSignificantFigures(calculateAverageVelocity(site))}</div>
                            <div class="metric-label">Average Velocity (m/s)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatSignificantFigures(calculateDischarge(site))}</div>
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
                </section>

                <!-- Sediment Analysis -->
                <section class="site-section sediment-section section-with-content">
                    <h3 class="section-header sediment-header">Sediment Analysis</h3>
                    <div class="metric-grid">
                        <div class="metric-card">
                            <div class="metric-value">${formatSedimentSizeValue(site)}</div>
                            <div class="metric-label">Average Size (mm)</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatSedimentRoundnessValue(site)}</div>
                            <div class="metric-label">Average Roundness</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${formatSpearmanValue(site)}</div>
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
                            ${(() => {
                              const correlation = calculateSpearmansRank(site);
                              if (correlation === null) return 'Insufficient data (minimum 3 measurements required)';
                              if (correlation > 0.7) return 'Strong positive correlation between size and roundness';
                              if (correlation > 0.3) return 'Moderate positive correlation between size and roundness';
                              if (correlation > -0.3) return 'Weak or no correlation between size and roundness';
                              if (correlation > -0.7) return 'Moderate negative correlation between size and roundness';
                              return 'Strong negative correlation between size and roundness';
                            })()}
                        </div>
                    ` : '<p style="text-align: center; color: #6b7280; font-style: italic; padding: 20px;">No sediment measurements recorded for this site</p>'}
                </section>
            </article>
        `).join('')}
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

  const { riverWalkId, fileName } = req.body as { riverWalkId?: string; fileName?: string };
  if (!riverWalkId) {
    return res.status(400).json({ error: 'River walk ID is required' });
  }

  let browser;
  try {
    logger.info('Fetching real data with authentication', { riverWalkId });
    
    // Create authenticated Supabase client
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    logger.debug('Auth token status', { hasAuthToken: !!authToken });
    
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

    logger.debug('River walk query result', { 
      hasRiverWalk: !!riverWalk,
      errorMessage: riverWalkError?.message 
    });

    // Fetch sites with authentication
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select(`
        *,
        measurement_points (*)
      `)
      .eq('river_walk_id', riverWalkId)
      .order('site_number', { ascending: true });

    logger.debug('Sites query result', { 
      sitesCount: sites?.length || 0,
      hasError: !!sitesError 
    });
    
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
      logger.debug('First site data structure', debugInfo);
      
      // Add debug info to response headers so we can see it in browser
      res.setHeader('X-Debug-Site-Info', JSON.stringify(debugInfo));
    }

    logger.info('Data summary', {
      hasRiverWalk: !!riverWalk,
      riverWalkName: riverWalk?.name,
      sitesCount: sites?.length || 0,
      hasErrors: !!(riverWalkError || sitesError)
    });

    if (riverWalk && !riverWalkError) {
      logger.info('Using real river walk data', { riverWalkName: riverWalk.name });
      if (sites && sites.length > 0) {
        logger.info('Found real sites with data', { sitesCount: sites.length });
      } else {
        logger.info('No sites found for this river walk - will show empty state');
      }
    } else {
      logger.warn('Could not fetch river walk data, will use sample data');
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

    // Create HTML content directly with the data
    logger.debug('Creating HTML content with fetched data');
    
    const htmlContent = createReportHTML(riverWalk, sites);
    
    logger.debug('Setting page content');
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    logger.debug('Setting viewport');
    await page.setViewport({ width: 1080, height: 1024 });

    // Wait for content to render and images to load
    logger.debug('Waiting for content to render and images to load');
    
    // Wait for all images to load
    await page.evaluate(() => {
      const images = Array.from(document.images);
      const imagePromises = images.map(img => {
        if (img.complete) {
          return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          // Set a timeout to prevent hanging on broken images
          setTimeout(() => resolve(null), 5000);
        });
      });
      return Promise.all(imagePromises);
    });
    
    // Additional time for layout to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate PDF with headers/footers and page numbers
    logger.info('Generating PDF');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '25mm', 
        right: '15mm', 
        bottom: '25mm', 
        left: '15mm' 
      },
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div class="pdf-header">
          <span style="font-size: 10px; color: #6b7280;">${riverWalk?.name || 'River Study Report'} - Generated ${new Date().toLocaleDateString('en-GB')}</span>
        </div>
      `,
      footerTemplate: `
        <div class="pdf-footer">
          <span style="font-size: 10px; color: #6b7280;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      scale: 1.0,
      // PDF metadata
      tagged: true,
      outline: false
    });

    // Note: PDF metadata like Title, Author, Subject are not directly supported in Puppeteer
    // but could be added via a post-processing library like pdf-lib if needed

    await page.close();
    await browser.close();

    const pdfBuffer = Buffer.from(pdf);
    const download = fileName || `river_walk_report_${riverWalkId}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${download}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    logger.info('PDF generated successfully');
    res.status(200).send(pdfBuffer);

  } catch (err: any) {
    logger.error('PDF generation error', { errorMessage: err?.message });
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        logger.error('Error closing browser', { error: closeErr instanceof Error ? closeErr.message : 'Unknown error' });
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