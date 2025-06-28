import React from 'react';
import { GetServerSideProps } from 'next';
import { supabase } from '../lib/supabase';
import type { RiverWalk, Site } from '../types';
import { formatDate } from '../lib/utils';
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
      .map(point => point.depth);

    const data = [
      {
        x: distances,
        y: depths,
        type: 'scatter' as const,
        mode: 'lines+markers' as const,
        name: 'River Bed',
        line: { color: 'brown', width: 3 },
        marker: { color: 'brown', size: 6 },
        fill: 'tonexty' as const,
        fillcolor: 'rgba(139, 69, 19, 0.3)',
      },
      {
        x: [0, site.river_width],
        y: [0, 0],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Water Surface',
        line: { color: 'blue', width: 2 },
      },
    ];

    const annotations = [
      {
        x: site.river_width / 2,
        y: 0.15,
        text: `Width: ${site.river_width}m`,
        showarrow: false,
        font: { size: 12, color: 'black' },
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        bordercolor: 'black',
        borderwidth: 1,
      },
    ];

    const shapes = [
      {
        type: 'line' as const,
        x0: 0,
        y0: 0.1,
        x1: site.river_width,
        y1: 0.1,
        line: { color: 'black', width: 2 },
      },
      {
        type: 'line' as const,
        x0: 0,
        y0: 0.2,
        x1: 0,
        y1: 0.1,
        line: { color: 'black', width: 2 },
      },
      {
        type: 'line' as const,
        x0: site.river_width,
        y0: 0.2,
        x1: site.river_width,
        y1: 0.1,
        line: { color: 'black', width: 2 },
      },
    ];

    return {
      data,
      layout: {
        title: {
          text: `Cross-Section: Site ${site.site_number}`,
          font: { size: 16 },
        },
        xaxis: {
          title: { text: 'Distance from Bank (m)' },
          range: [-0.5, site.river_width + 0.5],
          showgrid: true,
          gridcolor: 'lightgray',
          zeroline: false,
        },
        yaxis: {
          title: { text: 'Depth (m)' },
          autorange: true,
          showgrid: true,
          gridcolor: 'lightgray',
          zeroline: false,
        },
        plot_bgcolor: 'lightcyan',
        paper_bgcolor: 'white',
        width: 700,
        height: 400,
        margin: { l: 60, r: 40, t: 60, b: 60 },
        annotations,
        shapes,
      },
    };
  };

  return (
    <div className="print-report">
      <style jsx global>{`
        @media print {
          .pdf-component {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .plotly-graph-div {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          table {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .chart-container {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .site-section {
            break-before: page;
            page-break-before: always;
          }
          
          .site-section:first-of-type {
            break-before: auto;
            page-break-before: auto;
          }
        }
        
        body {
          font-family: Arial, sans-serif;
          line-height: 1.4;
          color: #333;
        }
        
        .print-report {
          max-width: none;
          padding: 20px;
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
                  <th className="border border-gray-300 px-4 py-2">Site</th>
                  <th className="border border-gray-300 px-4 py-2">Width (m)</th>
                  <th className="border border-gray-300 px-4 py-2">Avg Depth (m)</th>
                  <th className="border border-gray-300 px-4 py-2">Max Depth (m)</th>
                  <th className="border border-gray-300 px-4 py-2">Velocity (m/s)</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td className="border border-gray-300 px-4 py-2 text-center">{site.site_number}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{site.river_width}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{calculateAverageDepth(site).toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{calculateMaxDepth(site).toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{calculateAverageVelocity(site).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Individual Site Sections */}
      {sites.map((site, index) => {
        const crossSectionData = generateCrossSectionData(site);
        
        return (
          <div key={site.id} className={`pdf-component site-section ${index > 0 ? 'mt-8' : ''}`}>
            <h2 className="text-2xl font-semibold mb-4">Site {site.site_number}</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Measurements</h3>
                <p><strong>Width:</strong> {site.river_width}m</p>
                <p><strong>Average Depth:</strong> {calculateAverageDepth(site).toFixed(2)}m</p>
                <p><strong>Maximum Depth:</strong> {calculateMaxDepth(site).toFixed(2)}m</p>
                <p><strong>Velocity:</strong> {calculateAverageVelocity(site).toFixed(2)}m/s</p>
              </div>
              
              <div className="bg-amber-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Calculated Values</h3>
                <p><strong>Cross-sectional Area:</strong> {(site.river_width * calculateAverageDepth(site)).toFixed(2)}m²</p>
                <p><strong>Discharge:</strong> {(site.river_width * calculateAverageDepth(site) * calculateAverageVelocity(site)).toFixed(2)}m³/s</p>
                <p><strong>Wetted Perimeter:</strong> {(site.river_width + 2 * calculateAverageDepth(site)).toFixed(2)}m</p>
              </div>
            </div>

            {/* Cross-section Chart */}
            {crossSectionData && (
              <div className="pdf-component chart-container mb-6">
                <h3 className="font-semibold mb-2">Cross-Section Profile</h3>
                <Plot
                  data={crossSectionData.data}
                  layout={crossSectionData.layout}
                  config={{
                    displayModeBar: false,
                    staticPlot: true,
                    responsive: false,
                  }}
                />
              </div>
            )}

            {/* Measurement Points Table */}
            {site.measurement_points && site.measurement_points.length > 0 && (
              <div className="pdf-component">
                <h3 className="font-semibold mb-2">Measurement Points</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2">Point</th>
                        <th className="border border-gray-300 px-4 py-2">Distance from Bank (m)</th>
                        <th className="border border-gray-300 px-4 py-2">Depth (m)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {site.measurement_points
                        .sort((a, b) => a.point_number - b.point_number)
                        .map((point) => (
                          <tr key={point.id}>
                            <td className="border border-gray-300 px-4 py-2 text-center">{point.point_number}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{point.distance_from_bank}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{point.depth}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
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

  try {
    console.log('📊 Fetching river walk data from Supabase...');
    // Fetch river walk data
    const { data: riverWalk, error: riverWalkError } = await supabase
      .from('river_walks')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🏞️ River walk query result:', { data: riverWalk, error: riverWalkError });

    if (riverWalkError || !riverWalk) {
      console.log('❌ River walk not found or error occurred');
      return {
        notFound: true,
      };
    }

    console.log('📍 Fetching sites with measurement points...');
    // Fetch sites with measurement points
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select(`
        *,
        measurement_points (*)
      `)
      .eq('river_walk_id', id)
      .order('site_number');

    console.log('🏁 Sites query result:', { count: sites?.length || 0, error: sitesError });

    if (sitesError) {
      console.log('❌ Sites query error:', sitesError);
      throw sitesError;
    }

    console.log('✅ Data fetched successfully, returning props');
    return {
      props: {
        riverWalk,
        sites: sites || [],
      },
    };
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    return {
      notFound: true,
    };
  }
};