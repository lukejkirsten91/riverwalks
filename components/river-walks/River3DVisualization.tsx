import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Site } from '../../types';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">Loading 3D visualization...</div>
});

interface River3DVisualizationProps {
  sites: Site[];
  height?: number;
  title?: string;
}

export function River3DVisualization({ sites, height = 600, title = "3D River Profile" }: River3DVisualizationProps) {
  const [selectedSiteIndex, setSelectedSiteIndex] = useState<number | null>(null);
  const chartData = useMemo(() => {
    if (!sites || sites.length === 0) {
      return null;
    }

    // Filter sites that have measurement points
    const validSites = sites.filter(site => site.measurement_points && site.measurement_points.length > 0);
    
    if (validSites.length === 0) {
      return null;
    }

    // Determine which sites to show
    const sitesToShow = selectedSiteIndex !== null ? [validSites[selectedSiteIndex]] : validSites;
    const siteStartIndex = selectedSiteIndex !== null ? selectedSiteIndex : 0;

    // Parameters for visualization
    const numInterpPoints = 30;
    const maxWidth = Math.max(...validSites.map(site => site.river_width));

    // Create river bed surface with consistent depth convention (0 = water surface, negative = deeper)
    const riverXAll: number[][] = [];
    const riverYAll: number[][] = [];
    const riverZAll: number[][] = [];

    sitesToShow.forEach((site, displayIndex) => {
      const actualSiteIndex = selectedSiteIndex !== null ? selectedSiteIndex : displayIndex;
      const points = site.measurement_points!.sort((a, b) => a.point_number - b.point_number);
      const distances = points.map(p => p.distance_from_bank);
      const depths = points.map(p => p.depth);

      // Create interpolated points across this section
      const xInterp: number[] = [];
      const zInterp: number[] = [];

      for (let i = 0; i < numInterpPoints; i++) {
        const xPos = (i / (numInterpPoints - 1)) * site.river_width;
        xInterp.push(xPos);

        // Simple linear interpolation for depth
        let depth = 0;
        if (distances.length >= 2) {
          let leftIdx = 0;
          let rightIdx = distances.length - 1;
          
          for (let j = 0; j < distances.length - 1; j++) {
            if (distances[j] <= xPos && distances[j + 1] >= xPos) {
              leftIdx = j;
              rightIdx = j + 1;
              break;
            }
          }

          const leftDist = distances[leftIdx];
          const rightDist = distances[rightIdx];
          const leftDepth = depths[leftIdx];
          const rightDepth = depths[rightIdx];

          if (rightDist > leftDist) {
            const factor = (xPos - leftDist) / (rightDist - leftDist);
            depth = leftDepth + factor * (rightDepth - leftDepth);
          } else {
            depth = leftDepth;
          }
        } else {
          depth = depths[0] || 0;
        }

        zInterp.push(-depth); // Consistent depth convention: 0 = surface, negative = deeper
      }

      riverXAll.push(xInterp);
      riverYAll.push(Array(numInterpPoints).fill(displayIndex));
      riverZAll.push(zInterp);
    });

    // Calculate depth range for color scale (dark = deep, light = shallow)
    const allZ = riverZAll.flat();
    const maxDepth = Math.abs(Math.min(...allZ)); // Maximum depth (positive value)

    // Color scale: dark blue for deep water, light blue for shallow
    const colorscale: Array<[number, string]> = [
      [0, 'rgb(8, 48, 107)'],     // Very dark blue for deepest parts
      [0.3, 'rgb(8, 81, 156)'],  // Dark blue
      [0.6, 'rgb(33, 113, 181)'], // Medium blue
      [0.8, 'rgb(66, 146, 198)'], // Light blue
      [1, 'rgb(107, 174, 214)']   // Very light blue for shallow parts
    ];

    const traces: any[] = [];

    // River bed surface
    traces.push({
      type: 'surface',
      x: riverXAll,
      y: riverYAll,
      z: riverZAll,
      colorscale: colorscale,
      showscale: true,
      colorbar: {
        title: 'Depth (m)',
        titleside: 'right',
        x: 1.02,
        tickmode: 'linear',
        tick0: 0,
        dtick: maxDepth / 4
      },
      name: 'River Bed',
      lighting: {
        ambient: 0.8,
        diffuse: 0.9,
        specular: 0.2,
        roughness: 0.3
      },
      hoverinfo: 'skip'
    });

    // Transparent water surface
    const waterXAll: number[][] = [];
    const waterYAll: number[][] = [];
    const waterZAll: number[][] = [];

    sitesToShow.forEach((site, displayIndex) => {
      const waterX = [];
      for (let i = 0; i < numInterpPoints; i++) {
        waterX.push((i / (numInterpPoints - 1)) * site.river_width);
      }
      waterXAll.push(waterX);
      waterYAll.push(Array(numInterpPoints).fill(displayIndex));
      waterZAll.push(Array(numInterpPoints).fill(0)); // Water surface at z=0
    });

    traces.push({
      type: 'surface',
      x: waterXAll,
      y: waterYAll,
      z: waterZAll,
      colorscale: [[0, 'rgba(173, 216, 230, 0.3)'], [1, 'rgba(135, 206, 250, 0.3)']],
      showscale: false,
      opacity: 0.4,
      name: 'Water Surface',
      lighting: {
        ambient: 0.9,
        diffuse: 0.1,
        roughness: 0.1,
        specular: 0.8
      },
      hoverinfo: 'skip'
    });

    // Transparent base grid
    const gridExtension = maxWidth * 0.1;
    const gridXAll = [
      [-gridExtension, maxWidth + gridExtension, maxWidth + gridExtension, -gridExtension],
      [-gridExtension, maxWidth + gridExtension, maxWidth + gridExtension, -gridExtension]
    ];
    const gridYAll = [
      [0, 0, 0, 0],
      [sitesToShow.length - 1, sitesToShow.length - 1, sitesToShow.length - 1, sitesToShow.length - 1]
    ];
    const baseDepth = -(maxDepth + 1);
    const gridZAll = [
      [baseDepth, baseDepth, baseDepth, baseDepth],
      [baseDepth, baseDepth, baseDepth, baseDepth]
    ];

    traces.push({
      type: 'surface',
      x: gridXAll,
      y: gridYAll,
      z: gridZAll,
      colorscale: [[0, 'rgba(200, 200, 200, 0.2)'], [1, 'rgba(150, 150, 150, 0.2)']],
      showscale: false,
      opacity: 0.3,
      name: 'Base Grid',
      lighting: {
        ambient: 0.9,
        diffuse: 0.1
      },
      hoverinfo: 'skip'
    });

    // Add selective depth labels at key points only
    sitesToShow.forEach((site, displayIndex) => {
      const points = site.measurement_points!.sort((a, b) => a.point_number - b.point_number);
      const depths = points.map(p => p.depth);
      const maxDepthPoint = points[depths.indexOf(Math.max(...depths))];
      
      // Show depth at deepest point
      traces.push({
        type: 'scatter3d',
        mode: 'markers+text',
        x: [maxDepthPoint.distance_from_bank],
        y: [displayIndex],
        z: [-maxDepthPoint.depth],
        marker: {
          size: 8,
          color: 'red',
          symbol: 'circle',
          line: { color: 'darkred', width: 2 }
        },
        text: [`${maxDepthPoint.depth.toFixed(1)}m`],
        textposition: 'top center',
        textfont: { size: 10, color: 'black', family: 'Arial, sans-serif' },
        showlegend: false,
        hovertemplate: `Deepest Point<br>Depth: ${maxDepthPoint.depth.toFixed(1)}m<br>Distance: ${maxDepthPoint.distance_from_bank.toFixed(1)}m<extra></extra>`
      });

      // Show bank edges
      const leftBank = points[0];
      const rightBank = points[points.length - 1];
      
      traces.push({
        type: 'scatter3d',
        mode: 'text',
        x: [leftBank.distance_from_bank, rightBank.distance_from_bank],
        y: [displayIndex, displayIndex],
        z: [0.2, 0.2], // Slightly above water surface
        text: ['Left Bank', 'Right Bank'],
        textposition: 'middle center',
        textfont: { size: 9, color: 'black', family: 'Arial, sans-serif' },
        showlegend: false,
        hoverinfo: 'skip'
      });
    });

    // Add distance scale
    const scaleLength = Math.min(maxWidth / 4, 2); // Scale bar length
    traces.push({
      type: 'scatter3d',
      mode: 'lines+text',
      x: [0, scaleLength, scaleLength, 0],
      y: [-0.3, -0.3, -0.3, -0.3],
      z: [0.1, 0.1, 0.05, 0.05],
      line: { color: 'black', width: 4 },
      text: ['', `${scaleLength.toFixed(1)}m`, '', ''],
      textposition: 'top center',
      textfont: { size: 9, color: 'black' },
      showlegend: false,
      hoverinfo: 'skip'
    });

    // Add downstream arrow
    const arrowLength = maxWidth * 0.15;
    traces.push({
      type: 'scatter3d',
      mode: 'lines+text',
      x: [maxWidth * 0.8, maxWidth * 0.8 + arrowLength],
      y: [-0.2, -0.2],
      z: [0.15, 0.15],
      line: { color: 'blue', width: 6 },
      text: ['', '→ Downstream'],
      textposition: 'middle right',
      textfont: { size: 9, color: 'blue' },
      showlegend: false,
      hoverinfo: 'skip'
    });

    const displayTitle = selectedSiteIndex !== null 
      ? `${title} - ${sitesToShow[0].site_name}`
      : title;

    const layout = {
      title: {
        text: displayTitle,
        font: { size: 16 }
      },
      scene: {
        xaxis: {
          title: { text: 'Distance from Bank (m)' },
          showgrid: true,
          gridcolor: 'lightgray',
          range: [-maxWidth * 0.1, maxWidth * 1.1]
        },
        yaxis: {
          title: { text: selectedSiteIndex !== null ? 'Cross-Section' : 'River Sites' },
          showgrid: true,
          gridcolor: 'lightgray',
          tickmode: 'array' as const,
          tickvals: sitesToShow.map((_, i) => i),
          ticktext: selectedSiteIndex !== null ? [''] : sitesToShow.map((site, i) => `Site ${siteStartIndex + i + 1}`)
        },
        zaxis: {
          title: { text: 'Depth (m)' },
          showgrid: true,
          gridcolor: 'lightgray',
          range: [baseDepth, 0.3],
          autorange: false
        },
        aspectratio: { x: 2, y: selectedSiteIndex !== null ? 0.5 : 1.5, z: 1 },
        camera: {
          eye: { x: 1.5, y: selectedSiteIndex !== null ? -0.5 : -1.5, z: 1.2 },
          center: { x: 0.5, y: sitesToShow.length / 2, z: -maxDepth / 2 }
        }
      },
      height: height,
      margin: { l: 0, r: 0, b: 0, t: 40 },
      showlegend: false,
      hovermode: 'closest' as const
    };

    return { data: traces, layout };
  }, [sites, height, title, selectedSiteIndex]);

  // Filter valid sites for dropdown
  const validSites = sites.filter(site => site.measurement_points && site.measurement_points.length > 0);

  if (!chartData) {
    return (
      <div className="w-full bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">No measurement data available for 3D visualization</p>
        <p className="text-sm text-gray-500 mt-2">Add measurement points to your sites to see the 3D river profile</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border rounded-lg">
      {/* Site selector dropdown */}
      {validSites.length > 1 && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <label htmlFor="site-selector" className="text-sm font-medium text-gray-700">
              View:
            </label>
            <select
              id="site-selector"
              value={selectedSiteIndex === null ? 'all' : selectedSiteIndex.toString()}
              onChange={(e) => setSelectedSiteIndex(e.target.value === 'all' ? null : parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sites (3D Profile)</option>
              {validSites.map((site, index) => (
                <option key={site.id} value={index}>
                  {site.site_name} (Single Cross-Section)
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {selectedSiteIndex === null 
              ? "Showing all sites in 3D river profile view. Dark blue = deep water, light blue = shallow water."
              : `Showing detailed cross-section for ${validSites[selectedSiteIndex].site_name}. Use controls to rotate and zoom.`
            }
          </div>
        </div>
      )}

      {/* 3D Visualization */}
      <div className="p-4">
        <Plot
          data={chartData.data}
          layout={chartData.layout}
          config={{
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d', 'autoScale2d'],
            displaylogo: false,
            toImageButtonOptions: {
              format: 'png',
              filename: selectedSiteIndex !== null 
                ? `${validSites[selectedSiteIndex].site_name.replace(/\s+/g, '_')}_cross_section`
                : 'river_3d_profile',
              height: height,
              width: 800,
              scale: 1
            }
          }}
          style={{ width: '100%', height: `${height}px` }}
          useResizeHandler={true}
        />
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Legend</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-800 rounded"></div>
              <span>Deep water</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-300 rounded"></div>
              <span>Shallow water</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Deepest point</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            • 0m = Water surface, negative values = depth below surface
            • Arrow indicates downstream direction
            • Scale bar shows horizontal distance
          </div>
        </div>
      </div>
    </div>
  );
}