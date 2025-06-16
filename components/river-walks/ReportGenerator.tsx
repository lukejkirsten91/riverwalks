import React, { useState, useRef } from 'react';
import { Download, FileText, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatDate } from '../../lib/utils';
import type { RiverWalk, Site, MeasurementPoint } from '../../types';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">Loading chart...</div>
});

interface ReportGeneratorProps {
  riverWalk: RiverWalk;
  sites: Site[];
  onClose: () => void;
}

export function ReportGenerator({ riverWalk, sites, onClose }: ReportGeneratorProps) {
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

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

    return {
      data: [
        // Left bank
        {
          x: [-0.5, 0],
          y: [0.5, 0],
          mode: 'lines',
          fill: 'tozeroy',
          line: { color: 'brown', width: 0 },
          fillcolor: 'peru',
          name: 'Left Bank',
          showlegend: false,
        },
        // Right bank
        {
          x: [site.river_width, site.river_width + 0.5],
          y: [0, 0.5],
          mode: 'lines',
          fill: 'tozeroy',
          line: { color: 'brown', width: 0 },
          fillcolor: 'peru',
          name: 'Right Bank',
          showlegend: false,
        },
        // River bed
        {
          x: distances,
          y: depths,
          mode: 'lines+markers',
          fill: 'tozeroy',
          line: { color: 'royalblue', width: 2 },
          marker: { size: 8, color: 'darkblue', symbol: 'circle' },
          fillcolor: 'lightblue',
          name: 'River Bed',
          showlegend: false,
        },
        // Water surface
        {
          x: [0, site.river_width],
          y: [0, 0],
          mode: 'lines',
          line: { color: 'lightblue', width: 2 },
          name: 'Water Surface',
          showlegend: false,
        },
      ],
      layout: {
        title: {
          text: `Cross-Section: ${site.site_name}`,
          font: { size: 16 },
        },
        xaxis: {
          title: 'Distance from Bank (m)',
          range: [-0.5, site.river_width + 0.5],
          showgrid: true,
          gridcolor: 'lightgray',
        },
        yaxis: {
          title: 'Depth (m)',
          autorange: true,
          showgrid: true,
          gridcolor: 'lightgray',
        },
        plot_bgcolor: 'lightcyan',
        paper_bgcolor: 'white',
        height: 400,
        margin: { l: 60, r: 40, t: 60, b: 60 },
      },
    };
  };

  // Export report as PDF
  const exportToPDF = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);

    try {
      // Wait a bit for any dynamic content to render
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        height: reportRef.current.scrollHeight,
        width: reportRef.current.scrollWidth,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      const fileName = `${riverWalk.name.replace(/[^a-z0-9]/gi, '_')}_report.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-6xl min-h-[90vh] mt-4 mb-8">
        {/* Header with controls */}
        <div className="sticky top-0 bg-white border-b p-4 sm:p-6 z-10 rounded-t-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">River Walk Report</h2>
                <p className="text-sm text-muted-foreground">{riverWalk.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportToPDF}
                disabled={isExporting}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Report content */}
        <div ref={reportRef} className="p-6 sm:p-8 bg-white">
          {/* Report header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              River Study Report
            </h1>
            <h2 className="text-xl text-gray-700 mb-4">{riverWalk.name}</h2>
            <div className="text-gray-600">
              <p>Study Date: {formatDate(riverWalk.date)}</p>
              <p>Location: {riverWalk.county ? `${riverWalk.county}, ` : ''}{riverWalk.country || 'UK'}</p>
              {riverWalk.notes && <p className="mt-2 italic">"{riverWalk.notes}"</p>}
            </div>
          </div>

          {/* Summary section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Study Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800">Total Sites</h4>
                <p className="text-2xl font-bold text-blue-600">{sites.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800">Measurements</h4>
                <p className="text-2xl font-bold text-green-600">
                  {sites.reduce((total, site) => total + (site.measurement_points?.length || 0), 0)}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800">Avg Width</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {sites.length > 0 
                    ? (sites.reduce((sum, site) => sum + site.river_width, 0) / sites.length).toFixed(1)
                    : '0'
                  }m
                </p>
              </div>
            </div>
          </div>

          {/* Sites and measurements */}
          {sites.map((site, index) => {
            const chartData = generateCrossSectionData(site);
            
            return (
              <div key={site.id} className="mb-8 break-inside-avoid">
                <div className="border rounded-lg p-6">
                  {/* Site header */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900">
                          Site {site.site_number}: {site.site_name}
                        </h3>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <p><strong>River Width:</strong> {site.river_width}m</p>
                          {site.latitude && site.longitude && (
                            <p><strong>Coordinates:</strong> {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}</p>
                          )}
                          {site.notes && <p><strong>Notes:</strong> {site.notes}</p>}
                        </div>
                      </div>
                      {site.photo_url && (
                        <div className="ml-4 shrink-0">
                          <img
                            src={site.photo_url}
                            alt={`Photo of ${site.site_name}`}
                            className="w-32 h-24 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Measurement data table */}
                  {site.measurement_points && site.measurement_points.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">Measurement Data</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-3 py-2 text-left">Point</th>
                              <th className="border border-gray-300 px-3 py-2 text-left">Distance from Bank (m)</th>
                              <th className="border border-gray-300 px-3 py-2 text-left">Depth (m)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {site.measurement_points
                              .sort((a, b) => a.point_number - b.point_number)
                              .map((point, idx) => (
                                <tr key={point.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="border border-gray-300 px-3 py-2">{point.point_number}</td>
                                  <td className="border border-gray-300 px-3 py-2">{point.distance_from_bank.toFixed(1)}</td>
                                  <td className="border border-gray-300 px-3 py-2">{point.depth.toFixed(1)}</td>
                                </tr>
                              ))
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Cross-section chart */}
                  {chartData && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-3">Cross-Section Profile</h4>
                      <div className="bg-white border rounded-lg p-4">
                        <Plot
                          data={chartData.data as any}
                          layout={chartData.layout as any}
                          config={{
                            displayModeBar: false,
                            staticPlot: true,
                          }}
                          style={{ width: '100%', height: '400px' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Analysis section */}
                  {site.measurement_points && site.measurement_points.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Site Analysis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>Maximum Depth:</strong> {Math.max(...site.measurement_points.map(p => p.depth)).toFixed(1)}m</p>
                          <p><strong>Average Depth:</strong> {(site.measurement_points.reduce((sum, p) => sum + p.depth, 0) / site.measurement_points.length).toFixed(1)}m</p>
                        </div>
                        <div>
                          <p><strong>Measurement Points:</strong> {site.measurement_points.length}</p>
                          <p><strong>Width Coverage:</strong> {((Math.max(...site.measurement_points.map(p => p.distance_from_bank)) / site.river_width) * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
            <p>Generated on {new Date().toLocaleDateString()} using Riverwalks GCSE Geography Tool</p>
            <p className="mt-1">This report contains {sites.length} measurement sites with detailed cross-section analysis</p>
          </div>
        </div>
      </div>
    </div>
  );
}