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

  // Helper function to calculate cross-sectional area using trapezoidal rule
  const calculateCrossSectionalArea = (site: Site): number => {
    if (!site.measurement_points || site.measurement_points.length < 2) return 0;
    
    const sortedPoints = site.measurement_points.sort((a, b) => a.point_number - b.point_number);
    let area = 0;
    
    for (let i = 1; i < sortedPoints.length; i++) {
      const prevPoint = sortedPoints[i - 1];
      const currPoint = sortedPoints[i];
      const width = currPoint.distance_from_bank - prevPoint.distance_from_bank;
      const avgDepth = (prevPoint.depth + currPoint.depth) / 2;
      area += width * avgDepth;
    }
    
    return area;
  };

  // Helper function to calculate discharge (Q = A × V)
  const calculateDischarge = (site: Site): number => {
    const area = calculateCrossSectionalArea(site);
    const velocity = site.velocity_data?.average_velocity || 0;
    return area * velocity;
  };

  // Helper function to calculate Spearman's rank correlation
  const calculateSpearmansRank = (site: Site): number => {
    if (!site.sedimentation_data?.measurements || site.sedimentation_data.measurements.length < 3) return 0;
    
    const measurements = site.sedimentation_data.measurements;
    const n = measurements.length;
    
    // Rank sediment sizes and roundness values
    const sizeRanks = measurements
      .map((m, i) => ({ value: m.sediment_size, index: i }))
      .sort((a, b) => a.value - b.value)
      .map((item, rank) => ({ index: item.index, rank: rank + 1 }))
      .sort((a, b) => a.index - b.index)
      .map(item => item.rank);
    
    const roundnessRanks = measurements
      .map((m, i) => ({ value: m.sediment_roundness, index: i }))
      .sort((a, b) => a.value - b.value)
      .map((item, rank) => ({ index: item.index, rank: rank + 1 }))
      .sort((a, b) => a.index - b.index)
      .map(item => item.rank);
    
    // Calculate Spearman's rank correlation coefficient
    let d2Sum = 0;
    for (let i = 0; i < n; i++) {
      const d = sizeRanks[i] - roundnessRanks[i];
      d2Sum += d * d;
    }
    
    const rs = 1 - (6 * d2Sum) / (n * (n * n - 1));
    return rs;
  };

  // Helper function to calculate distance between two GPS coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c; // in metres
    return distance;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-2 sm:p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg w-full max-w-6xl max-h-[98vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with controls */}
        <div className="sticky top-0 bg-white border-b p-4 sm:p-6 z-10 rounded-t-lg shadow-sm">
          <div className="flex items-start justify-between gap-4">
            {/* Left side: Report info and export button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">River Walk Report</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{riverWalk.name}</p>
                </div>
              </div>
              <button
                onClick={exportToPDF}
                disabled={isExporting}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-3 shrink-0"
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
            </div>
            
            {/* Right side: Close button - always top-right */}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 touch-manipulation shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
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
          {/* NEW SUMMARY PAGE */}
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

            {/* Key Performance Indicators */}
            <div className="mb-8">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-2">Key Performance Indicators</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 text-sm sm:text-base">Total Sites</h4>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{sites.length}</p>
                </div>
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 text-sm sm:text-base">Total Area</h4>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {sites.reduce((total, site) => total + calculateCrossSectionalArea(site), 0).toFixed(1)}m²
                  </p>
                </div>
                <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 text-sm sm:text-base">Avg Velocity</h4>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">
                    {sites.filter(s => s.velocity_data?.average_velocity).length > 0 
                      ? (sites.reduce((sum, site) => sum + (site.velocity_data?.average_velocity || 0), 0) / 
                         sites.filter(s => s.velocity_data?.average_velocity).length).toFixed(2)
                      : '0.00'
                    }m/s
                  </p>
                </div>
                <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 text-sm sm:text-base">Total Discharge</h4>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">
                    {sites.reduce((total, site) => total + calculateDischarge(site), 0).toFixed(2)}m³/s
                  </p>
                </div>
              </div>
            </div>

            {/* Site Location Map */}
            <div className="mb-8">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-2">Site Locations</h3>
              {(() => {
                // Filter sites with coordinates
                const sitesWithCoords = sites.filter(site => site.latitude && site.longitude);
                
                if (sitesWithCoords.length === 0) {
                  return (
                    <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                      <div className="text-gray-600">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h4 className="text-lg font-semibold mb-2">No GPS Coordinates Available</h4>
                        <p className="text-sm">Add GPS coordinates to sites to see them plotted on the map</p>
                      </div>
                    </div>
                  );
                }

                // Calculate map bounds
                const lats = sitesWithCoords.map(s => s.latitude!);
                const lngs = sitesWithCoords.map(s => s.longitude!);
                const minLat = Math.min(...lats);
                const maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs);
                const maxLng = Math.max(...lngs);
                
                // Add padding to bounds
                const latPadding = (maxLat - minLat) * 0.1 || 0.001;
                const lngPadding = (maxLng - minLng) * 0.1 || 0.001;
                
                const boundedMinLat = minLat - latPadding;
                const boundedMaxLat = maxLat + latPadding;
                const boundedMinLng = minLng - lngPadding;
                const boundedMaxLng = maxLng + lngPadding;
                
                // Calculate scale for SVG
                const mapWidth = 600;
                const mapHeight = 400;
                const scaleX = mapWidth / (boundedMaxLng - boundedMinLng);
                const scaleY = mapHeight / (boundedMaxLat - boundedMinLat);
                
                // Convert lat/lng to SVG coordinates
                const sitePoints = sitesWithCoords.map(site => ({
                  ...site,
                  x: (site.longitude! - boundedMinLng) * scaleX,
                  y: mapHeight - (site.latitude! - boundedMinLat) * scaleY // Flip Y axis
                }));
                
                // Calculate distances between consecutive sites
                const distances: number[] = [];
                for (let i = 1; i < sitePoints.length; i++) {
                  const prev = sitesWithCoords[i - 1];
                  const curr = sitesWithCoords[i];
                  const distance = calculateDistance(prev.latitude!, prev.longitude!, curr.latitude!, curr.longitude!);
                  distances.push(distance);
                }
                
                // Calculate zoom level and center for embedding
                const centerLat = (boundedMinLat + boundedMaxLat) / 2;
                const centerLng = (boundedMinLng + boundedMaxLng) / 2;
                
                // Calculate appropriate zoom level based on bounding box
                const latDiff = boundedMaxLat - boundedMinLat;
                const lngDiff = boundedMaxLng - boundedMinLng;
                const maxDiff = Math.max(latDiff, lngDiff);
                let zoom = 15;
                if (maxDiff > 0.01) zoom = 13;
                if (maxDiff > 0.05) zoom = 11;
                if (maxDiff > 0.1) zoom = 10;
                if (maxDiff > 0.5) zoom = 8;
                
                // Debug: Log API key availability and map parameters
                console.log('Google Maps API Key available:', !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
                console.log('Map center:', centerLat, centerLng);
                console.log('Map zoom:', zoom);
                
                return (
                  <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                    {/* Static Map with Site Markers */}
                    <div className="relative">
                      {/* Google Maps Static API */}
                      <img
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=${zoom}&size=600x400&maptype=roadmap&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                        alt="Site Location Map"
                        className="w-full h-96 object-cover"
                        onError={(e) => {
                          console.error('Google Maps Static API failed to load');
                          console.error('API Key available:', !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
                          console.error('Full URL:', e.currentTarget.src);
                          const target = e.currentTarget;
                          target.alt = 'Map could not be loaded - check Google Maps API key';
                        }}
                      />
                      
                      {/* Overlay SVG for markers and connecting lines */}
                      <svg 
                        width="100%" 
                        height="400" 
                        viewBox={`0 0 ${mapWidth} ${mapHeight}`} 
                        className="absolute inset-0 z-10 pointer-events-none"
                        style={{ background: 'transparent' }}
                      >
                        
                        {/* Connecting lines between sites - Always show if multiple sites exist */}
                        {sitesWithCoords.length > 1 && sitePoints.map((point, index) => {
                          if (index === 0) return null;
                          const prevPoint = sitePoints[index - 1];
                          return (
                            <line
                              key={`line-${index}`}
                              x1={prevPoint.x}
                              y1={prevPoint.y}
                              x2={point.x}
                              y2={point.y}
                              stroke="#dc2626"
                              strokeWidth="3"
                              strokeDasharray="8,4"
                              strokeLinecap="round"
                            />
                          );
                        })}
                        
                        {/* Site markers */}
                        {sitePoints.map((point, index) => (
                          <g key={`site-${point.id}`}>
                            {/* Marker circle */}
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="12"
                              fill="#dc2626"
                              stroke="#ffffff"
                              strokeWidth="3"
                            />
                            
                            {/* Site number */}
                            <text
                              x={point.x}
                              y={point.y + 4}
                              textAnchor="middle"
                              fontSize="12"
                              fontWeight="bold"
                              fill="white"
                            >
                              {point.site_number}
                            </text>
                            
                            {/* Site label */}
                            <text
                              x={point.x}
                              y={point.y - 20}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="bold"
                              fill="#dc2626"
                            >
                              Site {point.site_number}
                            </text>
                            
                            {/* Distance label (for lines) */}
                            {index > 0 && distances[index - 1] && (
                              <text
                                x={(point.x + sitePoints[index - 1].x) / 2}
                                y={(point.y + sitePoints[index - 1].y) / 2 - 5}
                                textAnchor="middle"
                                fontSize="9"
                                fill="#dc2626"
                                fontWeight="bold"
                                style={{ filter: 'drop-shadow(0 0 2px white)' }}
                              >
                                {distances[index - 1].toFixed(0)}m
                              </text>
                            )}
                          </g>
                        ))}
                        
                        {/* Compass rose */}
                        <g transform="translate(550, 50)">
                          <circle cx="0" cy="0" r="25" fill="white" stroke="#666" strokeWidth="1"/>
                          <path d="M 0,-20 L 5,-5 L 0,0 L -5,-5 Z" fill="#dc2626"/>
                          <text x="0" y="-30" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#666">N</text>
                        </g>
                        
                        {/* Scale indicator */}
                        <g transform="translate(20, 350)">
                          <line x1="0" y1="0" x2="50" y2="0" stroke="#666" strokeWidth="2"/>
                          <line x1="0" y1="-3" x2="0" y2="3" stroke="#666" strokeWidth="2"/>
                          <line x1="50" y1="-3" x2="50" y2="3" stroke="#666" strokeWidth="2"/>
                          <text x="25" y="15" textAnchor="middle" fontSize="10" fill="#666">
                            {sitesWithCoords.length > 1 ? `~${(50 / scaleX * 111320).toFixed(0)}m` : '50px'}
                          </text>
                        </g>
                      </svg>
                    </div>
                    
                    {/* Map legend */}
                    <div className="p-4 bg-gray-50 border-t">
                      <div className="flex flex-wrap items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white"></div>
                          <span>Measurement Sites</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-0.5 bg-red-600" style={{backgroundImage: 'repeating-linear-gradient(to right, #dc2626 0, #dc2626 5px, transparent 5px, transparent 10px)'}}></div>
                          <span>Flight Lines</span>
                        </div>
                        <div className="text-gray-600">
                          Total Sites: {sitesWithCoords.length} | 
                          Total Distance: {distances.reduce((sum, d) => sum + d, 0).toFixed(0)}m
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Raw Data Tables */}
            <div className="space-y-8">
              {/* Cross-Sectional Area Summary Table */}
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-2">Cross-Sectional Area Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Measurement</th>
                        {sites.map((site, index) => (
                          <th key={site.id} className="border border-gray-300 px-3 py-2 text-center font-semibold">
                            Site {site.site_number}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium bg-gray-50">Width (m)</td>
                        {sites.map(site => (
                          <td key={`${site.id}-width`} className="border border-gray-300 px-3 py-2 text-center">
                            {site.river_width.toFixed(1)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium bg-gray-50">Average Depth (m)</td>
                        {sites.map(site => (
                          <td key={`${site.id}-depth`} className="border border-gray-300 px-3 py-2 text-center">
                            {site.measurement_points && site.measurement_points.length > 0
                              ? (site.measurement_points.reduce((sum, p) => sum + p.depth, 0) / site.measurement_points.length).toFixed(2)
                              : '0.00'
                            }
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium bg-gray-50">Cross-Sectional Area (m²)</td>
                        {sites.map(site => (
                          <td key={`${site.id}-area`} className="border border-gray-300 px-3 py-2 text-center font-semibold">
                            {calculateCrossSectionalArea(site).toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Velocity Summary Table */}
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-2">Velocity Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-green-50">
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Measurement</th>
                        {sites.map((site, index) => (
                          <th key={site.id} className="border border-gray-300 px-3 py-2 text-center font-semibold">
                            Site {site.site_number}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium bg-gray-50">Velocity (m/s)</td>
                        {sites.map(site => (
                          <td key={`${site.id}-velocity`} className="border border-gray-300 px-3 py-2 text-center">
                            {site.velocity_data?.average_velocity?.toFixed(3) || 'N/A'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium bg-gray-50">Discharge (m³/s)</td>
                        {sites.map(site => (
                          <td key={`${site.id}-discharge`} className="border border-gray-300 px-3 py-2 text-center font-semibold">
                            {calculateDischarge(site).toFixed(3)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sediment Summary Table */}
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-4 border-b pb-2">Sediment Analysis Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-amber-50">
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Measurement</th>
                        {sites.map((site, index) => (
                          <th key={site.id} className="border border-gray-300 px-3 py-2 text-center font-semibold">
                            Site {site.site_number}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium bg-gray-50">Sediment Size Average (mm)</td>
                        {sites.map(site => (
                          <td key={`${site.id}-size`} className="border border-gray-300 px-3 py-2 text-center">
                            {site.sedimentation_data?.measurements && site.sedimentation_data.measurements.length > 0
                              ? (site.sedimentation_data.measurements.reduce((sum, m) => sum + m.sediment_size, 0) / 
                                 site.sedimentation_data.measurements.length).toFixed(2)
                              : 'N/A'
                            }
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium bg-gray-50">Sediment Shape Average</td>
                        {sites.map(site => (
                          <td key={`${site.id}-shape`} className="border border-gray-300 px-3 py-2 text-center">
                            {site.sedimentation_data?.measurements && site.sedimentation_data.measurements.length > 0
                              ? (site.sedimentation_data.measurements.reduce((sum, m) => sum + m.sediment_roundness, 0) / 
                                 site.sedimentation_data.measurements.length).toFixed(1)
                              : 'N/A'
                            }
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium bg-gray-50">Spearman's Rank Correlation</td>
                        {sites.map(site => (
                          <td key={`${site.id}-spearman`} className="border border-gray-300 px-3 py-2 text-center font-semibold">
                            {site.sedimentation_data?.measurements && site.sedimentation_data.measurements.length >= 3
                              ? calculateSpearmansRank(site).toFixed(3)
                              : 'N/A'
                            }
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>


          {/* INDIVIDUAL SITE PAGES - Enhanced with distinct sections */}
          {sites.map((site, index) => {
            const chartData = generateCrossSectionData(site);
            
            return (
              <div key={site.id} className={`${index > 0 ? 'page-break-before' : ''} mb-8`} data-site-section>
                <div className="border rounded-lg overflow-hidden">
                  
                  {/* SITE HEADER SECTION */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                    <h3 className="text-2xl font-bold mb-2">
                      {site.site_name.trim() === `Site ${site.site_number}` 
                        ? `Site ${site.site_number}`
                        : `Site ${site.site_number}: ${site.site_name}`
                      }
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p><strong>River Width:</strong> {site.river_width}m</p>
                        <p><strong>Depth Units:</strong> {site.depth_units || 'm'}</p>
                      </div>
                      <div>
                        {site.latitude && site.longitude ? (
                          <p><strong>GPS:</strong> {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}</p>
                        ) : (
                          <p><strong>GPS:</strong> Not recorded</p>
                        )}
                        {site.weather_conditions && <p><strong>Weather:</strong> {site.weather_conditions}</p>}
                      </div>
                      <div>
                        {site.land_use && <p><strong>Land Use:</strong> {site.land_use}</p>}
                        <p><strong>Data Completeness:</strong> 
                          {[
                            site.measurement_points && site.measurement_points.length > 0 ? 'Cross-Section' : null,
                            site.velocity_data ? 'Velocity' : null,
                            site.sedimentation_data?.measurements?.length ? 'Sediment' : null
                          ].filter(Boolean).length}/3 sections
                        </p>
                      </div>
                    </div>
                    {site.notes && (
                      <div className="mt-4 p-3 bg-blue-800/30 rounded-lg">
                        <p><strong>Notes:</strong> {site.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* SITE PHOTOGRAPHY SECTION */}
                  {site.photo_url && (
                    <div className="bg-gray-50 p-6 border-b">
                      <h4 className="text-lg font-semibold mb-4 text-gray-800">Site Photography</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <img
                            src={site.photo_url}
                            alt={`Photo of ${site.site_name}`}
                            className="w-full h-64 object-cover rounded-lg border shadow-lg"
                          />
                          <p className="text-center text-sm text-gray-500 mt-2">Primary site photograph</p>
                        </div>
                        {site.sedimentation_photo_url && (
                          <div>
                            <img
                              src={site.sedimentation_photo_url}
                              alt={`Sediment sample at ${site.site_name}`}
                              className="w-full h-64 object-cover rounded-lg border shadow-lg"
                            />
                            <p className="text-center text-sm text-gray-500 mt-2">Sediment sample photograph</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CROSS-SECTIONAL ANALYSIS SECTION */}
                  {site.measurement_points && site.measurement_points.length > 0 && (
                    <div className="p-6 border-b">
                      <h4 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Cross-Sectional Analysis</h4>
                      
                      {/* Cross-section chart */}
                      <div className="mb-6">
                        <div className="bg-white border rounded-lg p-4">
                          <Plot
                            data={chartData?.data as any}
                            layout={{
                              ...chartData?.layout,
                              height: 400,
                              autosize: true,
                              responsive: true,
                              margin: { l: 60, r: 40, t: 60, b: 60 },
                            } as any}
                            config={{
                              displayModeBar: false,
                              staticPlot: true,
                              responsive: true,
                            }}
                            style={{ 
                              width: '100%', 
                              height: '400px' 
                            }}
                            useResizeHandler={true}
                          />
                        </div>
                      </div>

                      {/* Measurement data and analysis */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Raw measurement data */}
                        <div>
                          <h5 className="font-medium mb-3 text-gray-700">Raw Measurement Data</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-blue-50">
                                  <th className="border border-gray-300 px-3 py-2 text-left">Point</th>
                                  <th className="border border-gray-300 px-3 py-2 text-left">Distance (m)</th>
                                  <th className="border border-gray-300 px-3 py-2 text-left">Depth (m)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {site.measurement_points
                                  .sort((a, b) => a.point_number - b.point_number)
                                  .map((point, idx) => (
                                    <tr key={point.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-25'}>
                                      <td className="border border-gray-300 px-3 py-2 font-medium">{point.point_number}</td>
                                      <td className="border border-gray-300 px-3 py-2">{point.distance_from_bank.toFixed(2)}</td>
                                      <td className="border border-gray-300 px-3 py-2">{point.depth.toFixed(2)}</td>
                                    </tr>
                                  ))
                                }
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Statistical analysis */}
                        <div>
                          <h5 className="font-medium mb-3 text-gray-700">Statistical Analysis</h5>
                          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p><strong>Maximum Depth:</strong></p>
                                <p className="text-lg font-bold text-blue-600">
                                  {Math.max(...site.measurement_points.map(p => p.depth)).toFixed(2)}m
                                </p>
                              </div>
                              <div>
                                <p><strong>Average Depth:</strong></p>
                                <p className="text-lg font-bold text-blue-600">
                                  {(site.measurement_points.reduce((sum, p) => sum + p.depth, 0) / site.measurement_points.length).toFixed(2)}m
                                </p>
                              </div>
                              <div>
                                <p><strong>Cross-Sectional Area:</strong></p>
                                <p className="text-lg font-bold text-blue-600">
                                  {calculateCrossSectionalArea(site).toFixed(2)}m²
                                </p>
                              </div>
                              <div>
                                <p><strong>Measurement Points:</strong></p>
                                <p className="text-lg font-bold text-blue-600">
                                  {site.measurement_points.length}
                                </p>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t border-blue-200">
                              <p className="text-xs text-gray-600">
                                <strong>Coverage:</strong> {((Math.max(...site.measurement_points.map(p => p.distance_from_bank)) / site.river_width) * 100).toFixed(0)}% of river width measured
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VELOCITY ANALYSIS SECTION */}
                  {site.velocity_data && (
                    <div className="p-6 border-b">
                      <h4 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Velocity Analysis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h5 className="font-medium text-green-800 mb-2">Average Velocity</h5>
                          <p className="text-2xl font-bold text-green-600">
                            {site.velocity_data.average_velocity?.toFixed(3) || '0.000'}m/s
                          </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h5 className="font-medium text-green-800 mb-2">Discharge (Q = A × V)</h5>
                          <p className="text-2xl font-bold text-green-600">
                            {calculateDischarge(site).toFixed(3)}m³/s
                          </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h5 className="font-medium text-green-800 mb-2">Measurements</h5>
                          <p className="text-2xl font-bold text-green-600">
                            {site.velocity_measurement_count || 0}
                          </p>
                        </div>
                      </div>
                      
                      {/* Additional velocity details */}
                      {site.velocity_data.measurements && site.velocity_data.measurements.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium mb-3 text-gray-700">Individual Velocity Measurements</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-green-50">
                                  <th className="border border-gray-300 px-3 py-2 text-left">Measurement</th>
                                  <th className="border border-gray-300 px-3 py-2 text-left">Distance (m)</th>
                                  <th className="border border-gray-300 px-3 py-2 text-left">Time (s)</th>
                                  <th className="border border-gray-300 px-3 py-2 text-left">Velocity (m/s)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {site.velocity_data.measurements.map((measurement, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-green-25'}>
                                    <td className="border border-gray-300 px-3 py-2 font-medium">{measurement.measurement_number}</td>
                                    <td className="border border-gray-300 px-3 py-2">{measurement.float_travel_distance.toFixed(2)}</td>
                                    <td className="border border-gray-300 px-3 py-2">{measurement.time_seconds.toFixed(2)}</td>
                                    <td className="border border-gray-300 px-3 py-2">
                                      {measurement.velocity_ms.toFixed(3)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SEDIMENT ANALYSIS SECTION */}
                  {site.sedimentation_data && site.sedimentation_data.measurements && site.sedimentation_data.measurements.length > 0 && (
                    <div className="p-6">
                      <h4 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Sediment Analysis</h4>
                      
                      {/* Statistical summary */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-amber-50 p-4 rounded-lg">
                          <h5 className="font-medium text-amber-800 mb-2">Average Size</h5>
                          <p className="text-xl font-bold text-amber-600">
                            {(site.sedimentation_data.measurements.reduce((sum, m) => sum + m.sediment_size, 0) / 
                              site.sedimentation_data.measurements.length).toFixed(2)}mm
                          </p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg">
                          <h5 className="font-medium text-amber-800 mb-2">Average Roundness</h5>
                          <p className="text-xl font-bold text-amber-600">
                            {(site.sedimentation_data.measurements.reduce((sum, m) => sum + m.sediment_roundness, 0) / 
                              site.sedimentation_data.measurements.length).toFixed(1)}
                          </p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg">
                          <h5 className="font-medium text-amber-800 mb-2">Spearman's Rank</h5>
                          <p className="text-xl font-bold text-amber-600">
                            {site.sedimentation_data.measurements.length >= 3 
                              ? calculateSpearmansRank(site).toFixed(3)
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg">
                          <h5 className="font-medium text-amber-800 mb-2">Sample Count</h5>
                          <p className="text-xl font-bold text-amber-600">
                            {site.sedimentation_data.measurements.length}
                          </p>
                        </div>
                      </div>

                      {/* Detailed sedimentation data */}
                      <div>
                        <h5 className="font-medium mb-3 text-gray-700">Individual Sediment Measurements</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                              <tr className="bg-amber-50">
                                <th className="border border-gray-300 px-3 py-2 text-left">Sample</th>
                                <th className="border border-gray-300 px-3 py-2 text-left">Size ({site.sedimentation_units || 'mm'})</th>
                                <th className="border border-gray-300 px-3 py-2 text-left">Roundness (1-6)</th>
                                <th className="border border-gray-300 px-3 py-2 text-left">Size Category</th>
                                <th className="border border-gray-300 px-3 py-2 text-left">Shape Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {site.sedimentation_data.measurements.map((measurement, idx) => {
                                // Categorize sediment size (based on Wentworth scale)
                                const sizeCategory = measurement.sediment_size >= 64 ? 'Cobble' :
                                                   measurement.sediment_size >= 4 ? 'Pebble' :
                                                   measurement.sediment_size >= 2 ? 'Granule' :
                                                   measurement.sediment_size >= 0.25 ? 'Sand' : 'Silt';
                                
                                // Describe roundness
                                const roundnessDesc = measurement.sediment_roundness >= 5.5 ? 'Very rounded' :
                                                     measurement.sediment_roundness >= 4.5 ? 'Rounded' :
                                                     measurement.sediment_roundness >= 3.5 ? 'Sub-rounded' :
                                                     measurement.sediment_roundness >= 2.5 ? 'Sub-angular' :
                                                     measurement.sediment_roundness >= 1.5 ? 'Angular' : 'Very angular';
                                
                                return (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-25'}>
                                    <td className="border border-gray-300 px-3 py-2 font-medium">{idx + 1}</td>
                                    <td className="border border-gray-300 px-3 py-2">{measurement.sediment_size.toFixed(2)}</td>
                                    <td className="border border-gray-300 px-3 py-2">{measurement.sediment_roundness.toFixed(1)}</td>
                                    <td className="border border-gray-300 px-3 py-2 text-xs">{sizeCategory}</td>
                                    <td className="border border-gray-300 px-3 py-2 text-xs">{roundnessDesc}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Correlation interpretation */}
                      {site.sedimentation_data.measurements.length >= 3 && (
                        <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                          <h5 className="font-medium text-amber-800 mb-2">Correlation Interpretation</h5>
                          <p className="text-sm text-gray-700">
                            {(() => {
                              const correlation = calculateSpearmansRank(site);
                              if (correlation > 0.7) return "Strong positive correlation: Larger sediments tend to be more rounded.";
                              if (correlation > 0.3) return "Moderate positive correlation: Some tendency for larger sediments to be more rounded.";
                              if (correlation > -0.3) return "Weak/no correlation: No clear relationship between size and roundness.";
                              if (correlation > -0.7) return "Moderate negative correlation: Larger sediments tend to be more angular.";
                              return "Strong negative correlation: Larger sediments tend to be more angular.";
                            })()}
                          </p>
                        </div>
                      )}
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