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
    ];

    // Add measurement point labels as annotations
    const annotations = site.measurement_points
      .sort((a, b) => a.point_number - b.point_number)
      .map((point) => ({
        x: point.distance_from_bank,
        y: -point.depth - 0.1,
        text: `${point.depth}m`,
        showarrow: false,
        yshift: -10,
        font: { size: 10 },
      }));

    // Add width label annotation (positioned higher to avoid overlap)
    annotations.push({
      x: site.river_width / 2,
      y: 0.4,
      text: `${site.river_width}m`,
      showarrow: false,
      yshift: 0,
      font: { size: 10 },
    });

    const shapes = [
      // Width indicator line above the river
      {
        type: 'line',
        x0: 0,
        y0: 0.2,
        x1: site.river_width,
        y1: 0.2,
        line: { color: 'black', width: 2 },
      },
      // Small vertical lines at the ends of the width line
      {
        type: 'line',
        x0: 0,
        y0: 0.2,
        x1: 0,
        y1: 0.1,
        line: { color: 'black', width: 2 },
      },
      {
        type: 'line',
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
          text: `Cross-Section: ${site.site_name}`,
          font: { size: 16 },
        },
        xaxis: {
          title: 'Distance from Bank (m)',
          range: [-0.5, site.river_width + 0.5],
          showgrid: true,
          gridcolor: 'lightgray',
          zeroline: false, // Remove the zero line
        },
        yaxis: {
          title: 'Depth (m)',
          autorange: true,
          showgrid: true,
          gridcolor: 'lightgray',
          zeroline: false, // Remove the zero line
        },
        plot_bgcolor: 'lightcyan',
        paper_bgcolor: 'white',
        height: 400,
        margin: { l: 60, r: 40, t: 60, b: 60 },
        annotations,
        shapes,
      },
    };
  };

  // Export report as PDF
  const exportToPDF = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);

    try {
      // Wait for charts to render fully
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Capture individual sections for better page control
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm

      // First, add the header and summary section as the first page
      const headerElement = reportRef.current.querySelector('[data-summary-section]') as HTMLElement;
      if (headerElement) {
        const headerCanvas = await html2canvas(headerElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
        });
        
        const headerImgData = headerCanvas.toDataURL('image/png');
        const headerHeight = (headerCanvas.height * pageWidth) / headerCanvas.width;
        
        pdf.addImage(headerImgData, 'PNG', 0, 10, pageWidth, Math.min(headerHeight, pageHeight - 20));
      }

      // Get each site section and add as separate pages
      const siteElements = reportRef.current.querySelectorAll('[data-site-section]');
      
      for (let i = 0; i < siteElements.length; i++) {
        const siteElement = siteElements[i] as HTMLElement;
        
        // Add new page for each site
        pdf.addPage();

        const siteCanvas = await html2canvas(siteElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
        });

        const siteImgData = siteCanvas.toDataURL('image/png');
        const siteImgHeight = (siteCanvas.height * pageWidth) / siteCanvas.width;
        
        // If site content is too tall for one page, split it
        if (siteImgHeight > pageHeight - 20) {
          let yPosition = 10;
          let remainingHeight = siteImgHeight;
          let isFirstSitePage = true;
          
          while (remainingHeight > 0) {
            const currentPageHeight = Math.min(remainingHeight, pageHeight - 20);
            
            pdf.addImage(siteImgData, 'PNG', 0, yPosition, pageWidth, currentPageHeight);
            
            remainingHeight -= currentPageHeight;
            
            if (remainingHeight > 0) {
              pdf.addPage();
              yPosition = 10;
            }
          }
        } else {
          pdf.addImage(siteImgData, 'PNG', 0, 10, pageWidth, siteImgHeight);
        }
      }

      // Save the PDF with mobile-friendly approach
      const fileName = `${riverWalk.name.replace(/[^a-z0-9]/gi, '_')}_report.pdf`;
      
      // For mobile devices, use a different approach
      if (/Mobi|Android/i.test(navigator.userAgent)) {
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        
        // Create a temporary link for download
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } else {
        pdf.save(fileName);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-2 sm:p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg w-full max-w-6xl max-h-[98vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with controls */}
        <div className="sticky top-0 bg-white border-b p-4 sm:p-6 z-10 rounded-t-lg shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold truncate">River Walk Report</h2>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{riverWalk.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={exportToPDF}
                disabled={isExporting}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-3"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span className="hidden sm:inline">Generating PDF...</span>
                    <span className="sm:hidden">PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2 touch-manipulation"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Report content */}
        <div ref={reportRef} className="p-4 sm:p-6 lg:p-8 bg-white">
          <style>{`
            @media print {
              .page-break-before {
                page-break-before: always;
                break-before: page;
              }
            }
          `}</style>
          {/* Summary section (header + summary stats) */}
          <div data-summary-section className="mb-8">
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

            {/* Summary statistics */}
            <div>
              <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-2">Study Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 text-sm sm:text-base">Total Sites</h4>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{sites.length}</p>
                </div>
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 text-sm sm:text-base">Measurements</h4>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {sites.reduce((total, site) => total + (site.measurement_points?.length || 0), 0)}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 text-sm sm:text-base">Avg Width</h4>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">
                    {sites.length > 0 
                      ? (sites.reduce((sum, site) => sum + site.river_width, 0) / sites.length).toFixed(1)
                      : '0'
                    }m
                  </p>
                </div>
              </div>
            </div>
          </div>


          {/* Sites and measurements */}
          {sites.map((site, index) => {
            const chartData = generateCrossSectionData(site);
            
            return (
              <div key={site.id} className={`${index > 0 ? 'page-break-before' : ''} mb-8`} data-site-section>
                <div className="border rounded-lg p-4 sm:p-6">
                  {/* Site header */}
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                      {site.site_name === `Site ${site.site_number}` 
                        ? `Site ${site.site_number}`
                        : `Site ${site.site_number}: ${site.site_name}`
                      }
                    </h3>
                    
                    {/* Site photo - prominent placement */}
                    {site.photo_url && (
                      <div className="mb-6">
                        <img
                          src={site.photo_url}
                          alt={`Photo of ${site.site_name}`}
                          className="w-full max-w-md mx-auto h-48 sm:h-64 object-cover rounded-lg border shadow-lg"
                        />
                        <p className="text-center text-sm text-gray-500 mt-2">Site photograph</p>
                      </div>
                    )}
                    
                    {/* Site details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p><strong>River Width:</strong> {site.river_width}{site.depth_units || 'm'}</p>
                        {site.latitude && site.longitude && (
                          <p><strong>Coordinates:</strong> {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}</p>
                        )}
                        {site.weather_conditions && <p><strong>Weather:</strong> {site.weather_conditions}</p>}
                      </div>
                      <div>
                        {site.land_use && <p><strong>Land Use:</strong> {site.land_use}</p>}
                        {site.notes && <p><strong>Notes:</strong> {site.notes}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Measurement data table */}
                  {site.measurement_points && site.measurement_points.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">Measurement Data</h4>
                      <div className="overflow-x-auto -mx-2 sm:mx-0">
                        <table className="w-full border-collapse border border-gray-300 text-xs sm:text-sm min-w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-2 sm:px-3 py-2 text-left">Point</th>
                              <th className="border border-gray-300 px-2 sm:px-3 py-2 text-left">Distance (m)</th>
                              <th className="border border-gray-300 px-2 sm:px-3 py-2 text-left">Depth (m)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {site.measurement_points
                              .sort((a, b) => a.point_number - b.point_number)
                              .map((point, idx) => (
                                <tr key={point.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="border border-gray-300 px-2 sm:px-3 py-2">{point.point_number}</td>
                                  <td className="border border-gray-300 px-2 sm:px-3 py-2">{point.distance_from_bank.toFixed(2)}</td>
                                  <td className="border border-gray-300 px-2 sm:px-3 py-2">{point.depth.toFixed(2)}</td>
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
                          layout={{
                            ...chartData.layout,
                            height: typeof window !== 'undefined' && window.innerWidth < 768 ? 300 : 400,
                            autosize: true,
                            responsive: true,
                            margin: typeof window !== 'undefined' && window.innerWidth < 768 
                              ? { l: 40, r: 20, t: 40, b: 40 } 
                              : { l: 60, r: 40, t: 60, b: 60 },
                          } as any}
                          config={{
                            displayModeBar: false,
                            staticPlot: true,
                            responsive: true,
                            toImageButtonOptions: {
                              format: 'png',
                              filename: 'river_cross_section',
                              height: 400,
                              width: 600,
                              scale: 1
                            }
                          }}
                          style={{ 
                            width: '100%', 
                            height: typeof window !== 'undefined' && window.innerWidth < 768 ? '300px' : '400px' 
                          }}
                          useResizeHandler={true}
                        />
                      </div>
                    </div>
                  )}

                  {/* Analysis section */}
                  {site.measurement_points && site.measurement_points.length > 0 && (
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-sm sm:text-base">Site Analysis</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                        <div className="space-y-1">
                          <p><strong>Maximum Depth:</strong> {Math.max(...site.measurement_points.map(p => p.depth)).toFixed(1)}m</p>
                          <p><strong>Average Depth:</strong> {(site.measurement_points.reduce((sum, p) => sum + p.depth, 0) / site.measurement_points.length).toFixed(1)}m</p>
                        </div>
                        <div className="space-y-1">
                          <p><strong>Measurement Points:</strong> {site.measurement_points.length}</p>
                          <p><strong>Width Coverage:</strong> {((Math.max(...site.measurement_points.map(p => p.distance_from_bank)) / site.river_width) * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sedimentation section */}
                  {site.sedimentation_data && site.sedimentation_data.measurements && site.sedimentation_data.measurements.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Sedimentation Analysis</h4>
                      
                      {/* Sedimentation photo */}
                      {site.sedimentation_photo_url && (
                        <div className="mb-4">
                          <img
                            src={site.sedimentation_photo_url}
                            alt={`Sedimentation at ${site.site_name}`}
                            className="w-full max-w-sm mx-auto h-32 sm:h-48 object-cover rounded-lg border shadow-md"
                          />
                          <p className="text-center text-sm text-gray-500 mt-2">Sedimentation photograph</p>
                        </div>
                      )}

                      {/* Sedimentation data table */}
                      <div className="overflow-x-auto -mx-2 sm:mx-0">
                        <table className="w-full border-collapse border border-gray-300 text-xs sm:text-sm min-w-full">
                          <thead>
                            <tr className="bg-amber-50">
                              <th className="border border-gray-300 px-2 sm:px-3 py-2 text-left">Measurement</th>
                              <th className="border border-gray-300 px-2 sm:px-3 py-2 text-left">Sediment Size ({site.sedimentation_units || 'mm'})</th>
                              <th className="border border-gray-300 px-2 sm:px-3 py-2 text-left">Roundness</th>
                            </tr>
                          </thead>
                          <tbody>
                            {site.sedimentation_data.measurements.map((measurement, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-50'}>
                                <td className="border border-gray-300 px-2 sm:px-3 py-2">{idx + 1}</td>
                                <td className="border border-gray-300 px-2 sm:px-3 py-2">{measurement.sediment_size.toFixed(2)}</td>
                                <td className="border border-gray-300 px-2 sm:px-3 py-2">{measurement.sediment_roundness.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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