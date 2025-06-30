import React from 'react';
import { GetServerSideProps } from 'next';
import type { RiverWalk, Site } from '../../types';
import { formatDate } from '../../lib/utils';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">Loading chart...</div>
});

interface PrintReportProps {
  riverWalk: RiverWalk;
  sites: Site[];
}

export default function PrintReport({ riverWalk, sites }: PrintReportProps) {
  console.log('🖨️ PrintReport component rendering...');
  console.log('📊 River walk:', riverWalk);
  console.log('📍 Sites count:', sites?.length || 0);

  // Signal when report is ready for PDF generation
  React.useEffect(() => {
    const timer = setTimeout(() => {
      (window as any).__REPORT_READY = true;
      console.log('🚩 Report ready flag set');
    }, 2000); // Allow time for charts to render

    return () => clearTimeout(timer);
  }, []);

  // Helper function to calculate average depth for a site
  const calculateAverageDepth = (site: Site) => {
    if (!site.measurement_points || site.measurement_points.length === 0) return 0;
    const totalDepth = site.measurement_points.reduce((sum, point) => sum + point.depth, 0);
    return totalDepth / site.measurement_points.length;
  };

  // Helper function to calculate max depth for a site
  const calculateMaxDepth = (site: Site) => {
    if (!site.measurement_points || site.measurement_points.length === 0) return 0;
    return Math.max(...site.measurement_points.map(point => point.depth));
  };

  // Helper function to calculate average velocity for a site
  const calculateAverageVelocity = (site: Site) => {
    if (!site.velocity_data || !site.velocity_data.measurements || site.velocity_data.measurements.length === 0) return 0;
    const totalVelocity = site.velocity_data.measurements.reduce((sum, measurement) => sum + measurement.velocity_ms, 0);
    return totalVelocity / site.velocity_data.measurements.length;
  };

  // Generate cross-section chart data for a site
  const generateCrossSectionData = (site: Site) => {
    if (!site.measurement_points || site.measurement_points.length === 0) {
      return null;
    }

    const distances = site.measurement_points
      .sort((a, b) => a.point_number - b.point_number)
      .map(point => point.distance_from_bank);
    
    const depths = site.measurement_points
      .sort((a, b) => a.point_number - b.point_number)
      .map(point => -point.depth); // Negative for downward direction

    // Find the minimum depth to determine how deep to fill the brown area
    const minDepth = Math.min(...depths);
    const brownFillDepth = minDepth - 0.5; // Extend brown fill below the deepest point

    const data = [
      // Brown underground area (full width)
      {
        x: [-0.5, site.river_width + 0.5, site.river_width + 0.5, -0.5, -0.5],
        y: [brownFillDepth, brownFillDepth, 0, 0, brownFillDepth],
        mode: 'lines',
        fill: 'toself',
        line: { color: 'brown', width: 0 },
        fillcolor: 'peru',
        name: 'Underground',
        showlegend: false,
      },
      // Blue water area
      {
        x: [0, ...distances, site.river_width, 0],
        y: [0, ...depths, 0, 0],
        mode: 'lines',
        fill: 'toself',
        line: { color: 'blue', width: 2 },
        fillcolor: 'lightblue',
        name: 'Water',
        showlegend: false,
      },
      // Measurement points
      {
        x: distances,
        y: depths,
        mode: 'markers+lines',
        type: 'scatter',
        marker: { color: 'red', size: 8 },
        line: { color: 'blue', width: 2 },
        name: 'Depth Profile',
        showlegend: false,
      }
    ];

    return {
      data,
      layout: {
        title: `Cross-Section: Site ${site.site_number}`,
        xaxis: {
          title: 'Distance from Bank (m)',
          range: [-0.5, site.river_width + 0.5],
          showgrid: true,
          gridcolor: 'lightgray',
          zeroline: false,
        },
        yaxis: {
          title: 'Depth (m)',
          autorange: true,
          showgrid: true,
          gridcolor: 'lightgray',
          zeroline: false,
        },
        plot_bgcolor: 'lightcyan',
        paper_bgcolor: 'white',
        height: 400,
        margin: { l: 60, r: 40, t: 60, b: 60 },
      },
    };
  };

  return (
    <div className="min-h-screen bg-white text-black p-6">
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
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
            break-inside: auto !important; /* Allow tables to break if needed */
          }
          
          thead {
            display: table-header-group !important;
          }
          
          tr {
            break-inside: avoid !important; /* Keep rows together */
          }
          
          th, td {
            break-after: avoid !important;
          }
          
          .chart-container {
            break-inside: avoid !important;
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
          
          .measurements-header {
            break-after: avoid !important;
          }
          
          .chart-section {
            break-inside: avoid !important;
          }
          
          .summary-section {
            break-inside: avoid !important;
          }
          
          .overview-table {
            break-inside: avoid !important;
          }
          
          .site-calculations {
            break-inside: avoid !important;
          }
          
          .plotly-graph-div {
            break-inside: avoid !important;
          }
          
          .measurements-section {
            break-inside: avoid !important;
          }
          
          .site-data {
            break-inside: avoid !important;
          }
        }
        
        .chart-container .plotly-graph-div {
          break-inside: avoid !important;
        }
      `}</style>

      {/* Summary Section */}
      <div className="pdf-component mb-8">
        <h1 className="text-3xl font-bold mb-6 text-center">{riverWalk.name}</h1>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Study Details</h3>
            <p><strong>Date:</strong> {formatDate(riverWalk.date)}</p>
            <p><strong>Location:</strong> {riverWalk.county ? riverWalk.county + ', ' : ''}{riverWalk.country || 'UK'}</p>
            {riverWalk.notes && <p><strong>Notes:</strong> {riverWalk.notes}</p>}
          </div>
          
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Summary Statistics</h3>
            <p><strong>Total Sites:</strong> {sites.length}</p>
            <p><strong>Average Width:</strong> {sites.length > 0 ? (sites.reduce((sum, site) => sum + site.river_width, 0) / sites.length).toFixed(2) : '0'}m</p>
            <p><strong>Average Depth:</strong> {sites.length > 0 ? (sites.reduce((sum, site) => sum + calculateAverageDepth(site), 0) / sites.length).toFixed(2) : '0'}m</p>
          </div>
        </div>

        {/* Sites Overview Table */}
        <div className="pdf-component">
          <h2 className="text-xl font-semibold mb-4">Sites Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">Site</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Width (m)</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Avg Depth (m)</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Max Depth (m)</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Avg Velocity (m/s)</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Cross-sectional Area (m²)</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Discharge (m³/s)</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td className="border border-gray-300 px-3 py-2">{site.site_number}</td>
                    <td className="border border-gray-300 px-3 py-2">{site.river_width}</td>
                    <td className="border border-gray-300 px-3 py-2">{calculateAverageDepth(site).toFixed(2)}</td>
                    <td className="border border-gray-300 px-3 py-2">{calculateMaxDepth(site).toFixed(2)}</td>
                    <td className="border border-gray-300 px-3 py-2">{calculateAverageVelocity(site).toFixed(2)}</td>
                    <td className="border border-gray-300 px-3 py-2">{(site.river_width * calculateAverageDepth(site)).toFixed(2)}</td>
                    <td className="border border-gray-300 px-3 py-2">{(site.river_width * calculateAverageDepth(site) * calculateAverageVelocity(site)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Individual Site Details */}
      {sites.map((site, index) => (
        <div key={site.id} className={`pdf-site-section mb-12 ${index > 0 ? 'site-header' : ''}`}>
          <h2 className="text-2xl font-bold mb-6 text-center">Site {site.site_number}</h2>
          
          {/* Site measurements and calculations */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded site-data">
              <h3 className="font-semibold mb-3 measurements-header">Measurements</h3>
              <div className="space-y-1">
                <p><strong>Width:</strong> {site.river_width}m</p>
                <p><strong>Average Depth:</strong> {calculateAverageDepth(site).toFixed(2)}m</p>
                <p><strong>Maximum Depth:</strong> {calculateMaxDepth(site).toFixed(2)}m</p>
                <p><strong>Average Velocity:</strong> {calculateAverageVelocity(site).toFixed(2)}m/s</p>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded site-calculations">
              <h3 className="font-semibold mb-3">Calculated Values</h3>
              <div className="space-y-1">
                <p><strong>Cross-sectional Area:</strong> {(site.river_width * calculateAverageDepth(site)).toFixed(2)}m²</p>
                <p><strong>Discharge:</strong> {(site.river_width * calculateAverageDepth(site) * calculateAverageVelocity(site)).toFixed(2)}m³/s</p>
                <p><strong>Wetted Perimeter:</strong> {(site.river_width + 2 * calculateAverageDepth(site)).toFixed(2)}m</p>
              </div>
            </div>
          </div>

          {/* Measurement Points Table */}
          {site.measurement_points && site.measurement_points.length > 0 && (
            <div className="measurement-table mb-6">
              <h3 className="text-lg font-semibold mb-3 measurements-header">Measurement Points</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left">Point</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Distance from Bank (m)</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Depth (m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {site.measurement_points
                      .sort((a, b) => a.point_number - b.point_number)
                      .map((point) => (
                        <tr key={point.id}>
                          <td className="border border-gray-300 px-3 py-2">{point.point_number}</td>
                          <td className="border border-gray-300 px-3 py-2">{point.distance_from_bank}</td>
                          <td className="border border-gray-300 px-3 py-2">{point.depth}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cross-section Chart */}
          {generateCrossSectionData(site) && (
            <div className="chart-section chart-container">
              <h3 className="text-lg font-semibold mb-3">Cross-Section Profile</h3>
              <div className="bg-white p-4 rounded border">
                <Plot
                  data={generateCrossSectionData(site)!.data}
                  layout={generateCrossSectionData(site)!.layout}
                  config={{
                    displayModeBar: false,
                    staticPlot: true,
                    responsive: true,
                  }}
                  style={{ width: '100%', height: '400px' }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  console.log('🔄 getServerSideProps called for print-report');
  console.log('📋 Query params:', context.query);
  
  const { id } = context.query;
  console.log('🔍 River walk ID:', id);

  if (!id || typeof id !== 'string') {
    console.log('❌ Invalid or missing ID');
    return {
      notFound: true,
    };
  }

  console.log('🔍 Using sample data for PDF generation (skipping auth)...');
  
  // Always return sample data for PDF testing (no database calls)
  return {
    props: {
      riverWalk: {
        id: id,
        name: 'Aldenham River Report',
        date: new Date().toISOString(),
        county: 'Hertfordshire',
        country: 'UK',
        notes: 'GCSE Geography Coursework - River Study Analysis'
      },
      sites: [
        {
          id: 'sample-1',
          site_number: 1,
          river_width: 5.2,
          measurement_points: [
            { id: 'mp1', point_number: 1, distance_from_bank: 0, depth: 0.1 },
            { id: 'mp2', point_number: 2, distance_from_bank: 1, depth: 0.3 },
            { id: 'mp3', point_number: 3, distance_from_bank: 2, depth: 0.5 },
            { id: 'mp4', point_number: 4, distance_from_bank: 3, depth: 0.4 },
            { id: 'mp5', point_number: 5, distance_from_bank: 4, depth: 0.2 },
            { id: 'mp6', point_number: 6, distance_from_bank: 5.2, depth: 0.1 }
          ],
          velocity_data: {
            measurements: [
              { velocity_ms: 0.5 },
              { velocity_ms: 0.6 },
              { velocity_ms: 0.4 }
            ]
          }
        },
        {
          id: 'sample-2',
          site_number: 2,
          river_width: 6.8,
          measurement_points: [
            { id: 'mp7', point_number: 1, distance_from_bank: 0, depth: 0.15 },
            { id: 'mp8', point_number: 2, distance_from_bank: 1.5, depth: 0.4 },
            { id: 'mp9', point_number: 3, distance_from_bank: 3, depth: 0.7 },
            { id: 'mp10', point_number: 4, distance_from_bank: 4.5, depth: 0.5 },
            { id: 'mp11', point_number: 5, distance_from_bank: 6, depth: 0.3 },
            { id: 'mp12', point_number: 6, distance_from_bank: 6.8, depth: 0.1 }
          ],
          velocity_data: {
            measurements: [
              { velocity_ms: 0.3 },
              { velocity_ms: 0.7 },
              { velocity_ms: 0.5 },
              { velocity_ms: 0.6 }
            ]
          }
        }
      ]
    }
  };
};