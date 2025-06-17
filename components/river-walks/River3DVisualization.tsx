import React, { useMemo } from 'react';
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
  const chartData = useMemo(() => {
    if (!sites || sites.length === 0) {
      return null;
    }

    // Filter sites that have measurement points
    const validSites = sites.filter(site => site.measurement_points && site.measurement_points.length > 0);
    
    if (validSites.length === 0) {
      return null;
    }

    // Parameters for visualization
    const numInterpPoints = 30;
    const bankExtension = Math.max(...validSites.map(site => site.river_width)) * 0.3;
    const bankHeight = 0.3;

    // Create river bed surface
    const riverXAll: number[][] = [];
    const riverYAll: number[][] = [];
    const riverZAll: number[][] = [];

    validSites.forEach((site, siteIndex) => {
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
          // Find the two nearest points for interpolation
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

        zInterp.push(-depth); // Negative for downward direction
      }

      riverXAll.push(xInterp);
      riverYAll.push(Array(numInterpPoints).fill(siteIndex));
      riverZAll.push(zInterp);
    });

    // Calculate color scale based on elevation
    const allZ = riverZAll.flat();
    const zMin = Math.min(...allZ);
    const zMax = Math.max(0, Math.max(...allZ));

    let colorscale: Array<[number, string]>;
    if (zMin < 0) {
      // Calculate position of z=0 in normalized range
      const zeroPos = Math.abs(zMin) / (Math.abs(zMin) + zMax);
      colorscale = [
        [0, 'rgb(0, 0, 139)'],           // Dark blue for deepest parts
        [zeroPos * 0.7, 'rgb(30, 144, 255)'],  // Dodger blue
        [zeroPos * 0.9, 'rgb(65, 105, 225)'],  // Royal blue approaching surface
        [zeroPos, 'rgb(135, 206, 250)'],       // Light blue at water surface (z=0)
        [zeroPos + 0.01, 'rgb(160, 82, 45)'],  // Brown just above water
        [1, 'rgb(139, 69, 19)']                // Dark brown for high banks
      ];
    } else {
      colorscale = [
        [0, 'rgb(160, 82, 45)'],    // Medium brown
        [1, 'rgb(139, 69, 19)']     // Dark brown
      ];
    }

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
        title: 'Elevation (m)',
        titleside: 'right',
        x: 1.02
      },
      name: 'River Bed & Banks',
      lighting: {
        ambient: 0.7,
        diffuse: 0.9,
        specular: 0.3,
        roughness: 0.6
      },
      hoverinfo: 'skip'
    });

    // Add water surface (transparent)
    const waterXAll: number[][] = [];
    const waterYAll: number[][] = [];
    const waterZAll: number[][] = [];

    validSites.forEach((site, siteIndex) => {
      const waterX = [];
      for (let i = 0; i < numInterpPoints; i++) {
        waterX.push((i / (numInterpPoints - 1)) * site.river_width);
      }
      waterXAll.push(waterX);
      waterYAll.push(Array(numInterpPoints).fill(siteIndex));
      waterZAll.push(Array(numInterpPoints).fill(0)); // Water surface at z=0
    });

    traces.push({
      type: 'surface',
      x: waterXAll,
      y: waterYAll,
      z: waterZAll,
      colorscale: [[0, 'rgba(173, 216, 230, 0.5)'], [1, 'rgba(135, 206, 250, 0.5)']],
      showscale: false,
      opacity: 0.6,
      name: 'Water Surface',
      lighting: {
        ambient: 0.8,
        diffuse: 0.9,
        roughness: 0.1,
        specular: 0.6
      },
      hoverinfo: 'skip'
    });

    // Add underground brown areas around and below the river
    const undergroundDepth = Math.abs(zMin) + 2; // Extend below deepest point
    
    validSites.forEach((site, siteIndex) => {
      if (siteIndex < validSites.length - 1) {
        // Create underground surfaces between sites
        const nextSiteIndex = siteIndex + 1;
        const currentWidth = site.river_width;
        const nextWidth = validSites[nextSiteIndex].river_width;
        const maxSiteWidth = Math.max(currentWidth, nextWidth);
        
        // Underground area - extends beyond river width
        const undergroundX = [
          [-bankExtension, maxSiteWidth + bankExtension, maxSiteWidth + bankExtension, -bankExtension],
          [-bankExtension, maxSiteWidth + bankExtension, maxSiteWidth + bankExtension, -bankExtension]
        ];
        const undergroundY = [
          [siteIndex, siteIndex, siteIndex, siteIndex],
          [nextSiteIndex, nextSiteIndex, nextSiteIndex, nextSiteIndex]
        ];
        const undergroundZ = [
          [-undergroundDepth, -undergroundDepth, 0, 0],
          [-undergroundDepth, -undergroundDepth, 0, 0]
        ];
        
        traces.push({
          type: 'surface',
          x: undergroundX,
          y: undergroundY,
          z: undergroundZ,
          colorscale: [[0, 'rgb(139, 69, 19)'], [1, 'rgb(160, 82, 45)']],
          showscale: false,
          opacity: 0.8,
          name: 'Underground',
          lighting: {
            ambient: 0.6,
            diffuse: 0.8,
            roughness: 0.9
          },
          hoverinfo: 'skip'
        });
      }
    });

    // Add bold lines connecting measurement points at each site
    validSites.forEach((site, siteIndex) => {
      const points = site.measurement_points!.sort((a, b) => a.point_number - b.point_number);
      
      // Bold line connecting all points at this site
      traces.push({
        type: 'scatter3d',
        mode: 'lines',
        x: points.map(p => p.distance_from_bank),
        y: Array(points.length).fill(siteIndex),
        z: points.map(p => -p.depth),
        line: {
          color: 'rgba(255, 0, 0, 0.8)',
          width: 8
        },
        showlegend: false,
        hoverinfo: 'skip',
        name: `Site ${siteIndex + 1} Profile`
      });
    });

    // Add measurement point markers
    validSites.forEach((site, siteIndex) => {
      const points = site.measurement_points!.sort((a, b) => a.point_number - b.point_number);
      
      traces.push({
        type: 'scatter3d',
        mode: 'markers+text',
        x: points.map(p => p.distance_from_bank),
        y: Array(points.length).fill(siteIndex),
        z: points.map(p => -p.depth),
        marker: {
          size: 6,
          color: 'red',
          symbol: 'circle',
          line: {
            color: 'darkred',
            width: 2
          }
        },
        text: points.map(p => `${p.depth.toFixed(1)}m`),
        textposition: 'top center',
        textfont: { size: 8, color: 'black' },
        showlegend: false,
        hovertemplate: points.map((p, idx) => 
          `Site: ${site.site_name}<br>Point ${p.point_number}<br>Distance: ${p.distance_from_bank.toFixed(1)}m<br>Depth: ${p.depth.toFixed(1)}m<extra></extra>`
        )
      });
    });

    // Add site labels
    const maxWidth = Math.max(...validSites.map(site => site.river_width));
    validSites.forEach((site, siteIndex) => {
      traces.push({
        type: 'scatter3d',
        mode: 'text',
        x: [maxWidth + bankExtension + 0.5],
        y: [siteIndex],
        z: [bankHeight],
        text: [site.site_name],
        textposition: 'middle right',
        textfont: { size: 12, color: 'black' },
        showlegend: false,
        hoverinfo: 'skip'
      });
    });

    const layout = {
      title: {
        text: title,
        font: { size: 16 }
      },
      scene: {
        xaxis: {
          title: { text: 'Width (m)' },
          showgrid: true,
          gridcolor: 'lightgray',
          range: [-bankExtension * 0.2, maxWidth + bankExtension + 1]
        },
        yaxis: {
          title: { text: 'River Sites' },
          showgrid: true,
          gridcolor: 'lightgray',
          tickmode: 'array' as const,
          tickvals: validSites.map((_, i) => i),
          ticktext: validSites.map((site, i) => `Site ${i + 1}`)
        },
        zaxis: {
          title: { text: 'Elevation (m)' },
          showgrid: true,
          gridcolor: 'lightgray',
          range: [-(Math.abs(zMin) + 2.5), Math.max(bankHeight + 0.5, zMax * 1.1)]
        },
        aspectratio: { x: 1.5, y: 2, z: 0.8 },
        camera: {
          eye: { x: 1.8, y: -1.8, z: 1.0 },
          center: { x: 0.3, y: validSites.length / 2, z: -0.5 }
        }
      },
      height: height,
      margin: { l: 0, r: 0, b: 0, t: 40 },
      showlegend: false,
      hovermode: 'closest' as const
    };

    return { data: traces, layout };
  }, [sites, height, title]);

  if (!chartData) {
    return (
      <div className="w-full bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">No measurement data available for 3D visualization</p>
        <p className="text-sm text-gray-500 mt-2">Add measurement points to your sites to see the 3D river profile</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border rounded-lg p-4">
      <Plot
        data={chartData.data}
        layout={chartData.layout}
        config={{
          displayModeBar: true,
          modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d', 'autoScale2d'],
          displaylogo: false,
          toImageButtonOptions: {
            format: 'png',
            filename: 'river_3d_visualization',
            height: height,
            width: 800,
            scale: 1
          }
        }}
        style={{ width: '100%', height: `${height}px` }}
        useResizeHandler={true}
      />
    </div>
  );
}