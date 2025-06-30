// pages/api/generate-pdf-make.ts
import { NextApiRequest, NextApiResponse } from 'next';
import PdfPrinter from 'pdfmake';
import { supabase } from '../../lib/supabase';
import type { RiverWalk, Site } from '../../types';

export const dynamic = 'force-dynamic';

// Define fonts (using built-in fonts)
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

// Helper functions
const calculateAverageDepth = (site: Site) => {
  if (!site.measurement_points || site.measurement_points.length === 0) return 0;
  const totalDepth = site.measurement_points.reduce((sum, point) => sum + point.depth, 0);
  return totalDepth / site.measurement_points.length;
};

const calculateMaxDepth = (site: Site) => {
  if (!site.measurement_points || site.measurement_points.length === 0) return 0;
  return Math.max(...site.measurement_points.map(point => point.depth));
};

const calculateAverageVelocity = (site: Site) => {
  if (!site.velocity_data || !site.velocity_data.measurements || site.velocity_data.measurements.length === 0) return 0;
  const totalVelocity = site.velocity_data.measurements.reduce((sum, measurement) => sum + measurement.velocity_ms, 0);
  return totalVelocity / site.velocity_data.measurements.length;
};

function createPdfDocumentDefinition(riverWalk: RiverWalk, sites: Site[]) {
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10
    },
    content: [
      // Title
      {
        text: riverWalk.name,
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      
      // Summary section
      {
        text: 'Study Details & Summary Statistics',
        style: 'subheader',
        margin: [0, 0, 0, 10]
      },
      {
        columns: [
          {
            width: '48%',
            stack: [
              { text: 'Study Details', style: 'bold', margin: [0, 0, 0, 5] },
              { text: `Date: ${new Date(riverWalk.date).toLocaleDateString()}` },
              { text: `Location: ${riverWalk.county ? riverWalk.county + ', ' : ''}${riverWalk.country || 'UK'}` },
              ...(riverWalk.notes ? [{ text: `Notes: ${riverWalk.notes}` }] : [])
            ],
            margin: [0, 0, 10, 0]
          },
          {
            width: '48%',
            stack: [
              { text: 'Summary Statistics', style: 'bold', margin: [0, 0, 0, 5] },
              { text: `Total Sites: ${sites.length}` },
              { text: `Average Width: ${sites.length > 0 ? (sites.reduce((sum, site) => sum + site.river_width, 0) / sites.length).toFixed(2) : '0'}m` },
              { text: `Average Depth: ${sites.length > 0 ? (sites.reduce((sum, site) => sum + calculateAverageDepth(site), 0) / sites.length).toFixed(2) : '0'}m` }
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Sites overview table
      {
        text: 'Sites Overview',
        style: 'subheader',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', '*', '*', '*'],
          body: [
            [
              { text: 'Site', style: 'tableHeader' },
              { text: 'Width (m)', style: 'tableHeader' },
              { text: 'Avg Depth (m)', style: 'tableHeader' },
              { text: 'Max Depth (m)', style: 'tableHeader' },
              { text: 'Velocity (m/s)', style: 'tableHeader' }
            ],
            ...sites.map(site => [
              { text: site.site_number.toString(), alignment: 'center' },
              { text: site.river_width.toString(), alignment: 'center' },
              { text: calculateAverageDepth(site).toFixed(2), alignment: 'center' },
              { text: calculateMaxDepth(site).toFixed(2), alignment: 'center' },
              { text: calculateAverageVelocity(site).toFixed(2), alignment: 'center' }
            ])
          ]
        },
        layout: {
          fillColor: function (rowIndex: number) {
            return rowIndex === 0 ? '#f3f4f6' : null;
          }
        },
        margin: [0, 0, 0, 20]
      }
    ],
    styles: {
      header: {
        fontSize: 20,
        bold: true
      },
      subheader: {
        fontSize: 14,
        bold: true,
        color: '#2563eb'
      },
      tableHeader: {
        bold: true,
        fontSize: 9,
        color: 'black',
        alignment: 'center'
      },
      bold: {
        bold: true
      }
    }
  };

  // Add individual site pages
  sites.forEach((site, index) => {
    // Page break before each site (except first)
    if (index > 0) {
      docDefinition.content.push({ text: '', pageBreak: 'before' });
    }
    
    docDefinition.content.push(
      // Site title
      {
        text: `Site ${site.site_number}`,
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      
      // Site measurements
      {
        text: 'Measurements & Calculations',
        style: 'subheader',
        margin: [0, 0, 0, 10]
      },
      {
        columns: [
          {
            width: '48%',
            stack: [
              { text: 'Measurements', style: 'bold', margin: [0, 0, 0, 5] },
              { text: `Width: ${site.river_width}m` },
              { text: `Average Depth: ${calculateAverageDepth(site).toFixed(2)}m` },
              { text: `Maximum Depth: ${calculateMaxDepth(site).toFixed(2)}m` },
              { text: `Velocity: ${calculateAverageVelocity(site).toFixed(2)}m/s` }
            ],
            margin: [0, 0, 10, 0]
          },
          {
            width: '48%',
            stack: [
              { text: 'Calculated Values', style: 'bold', margin: [0, 0, 0, 5] },
              { text: `Cross-sectional Area: ${(site.river_width * calculateAverageDepth(site)).toFixed(2)}m²` },
              { text: `Discharge: ${(site.river_width * calculateAverageDepth(site) * calculateAverageVelocity(site)).toFixed(2)}m³/s` },
              { text: `Wetted Perimeter: ${(site.river_width + 2 * calculateAverageDepth(site)).toFixed(2)}m` }
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      }
    );

    // Measurement points table
    if (site.measurement_points && site.measurement_points.length > 0) {
      docDefinition.content.push(
        {
          text: 'Measurement Points',
          style: 'subheader',
          margin: [0, 0, 0, 10]
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*'],
            body: [
              [
                { text: 'Point', style: 'tableHeader' },
                { text: 'Distance from Bank (m)', style: 'tableHeader' },
                { text: 'Depth (m)', style: 'tableHeader' }
              ],
              ...site.measurement_points
                .sort((a, b) => a.point_number - b.point_number)
                .map(point => [
                  { text: point.point_number.toString(), alignment: 'center' },
                  { text: point.distance_from_bank.toString(), alignment: 'center' },
                  { text: point.depth.toString(), alignment: 'center' }
                ])
            ]
          },
          layout: {
            fillColor: function (rowIndex: number) {
              return rowIndex === 0 ? '#f3f4f6' : null;
            }
          },
          margin: [0, 0, 0, 20]
        }
      );
    }
  });

  return docDefinition;
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

  try {
    console.log('🔍 Fetching river walk with ID:', riverWalkId);
    
    // Fetch river walk data
    const { data: riverWalk, error: riverWalkError } = await supabase
      .from('river_walks')
      .select('*')
      .eq('id', riverWalkId)
      .single();

    console.log('📊 Database response:', { riverWalk, riverWalkError });

    if (riverWalkError || !riverWalk) {
      console.error('❌ River walk not found:', riverWalkError);
      return res.status(404).json({ 
        error: 'River walk not found',
        details: riverWalkError?.message || 'No data returned',
        searchedId: riverWalkId
      });
    }

    console.log('🏞️ Fetching sites for river walk:', riverWalkId);
    
    // Fetch sites with measurement points
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select(`
        *,
        measurement_points (*)
      `)
      .eq('river_walk_id', riverWalkId)
      .order('site_number');

    console.log('📍 Sites response:', { sitesCount: sites?.length || 0, sitesError });

    if (sitesError) {
      console.error('❌ Sites query error:', sitesError);
      throw sitesError;
    }

    // Create PDF
    const printer = new PdfPrinter(fonts);
    const docDefinition = createPdfDocumentDefinition(riverWalk, sites || []);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    // Convert to buffer
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
    
    return new Promise<void>((resolve, reject) => {
      pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const download = fileName || `river_walk_report_${riverWalkId}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${download}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        res.status(200).send(pdfBuffer);
        resolve();
      });
      
      pdfDoc.on('error', (err: any) => {
        console.error('PDF generation error:', err);
        reject(err);
      });
      
      pdfDoc.end();
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
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