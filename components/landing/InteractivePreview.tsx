import { useState, useEffect, useRef } from 'react';
import { Play, ChevronRight, FileText, ArrowRight, ArrowLeft, MapPin, BarChart3 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface MeasurementPoint {
  distance: number;
  depth: number;
}

interface VelocityMeasurement {
  time: number;
  distance: number;
  velocity: number;
}

interface SedimentMeasurement {
  size_mm: number;
  roundness: number;
}

interface DemoSiteData {
  siteName: string;
  riverWidth: number;
  measurementPoints: MeasurementPoint[];
  velocityMeasurements: VelocityMeasurement[];
  averageVelocity: number;
  sedimentMeasurements: SedimentMeasurement[];
}

interface InteractivePreviewProps {
  onSignIn?: () => void;
}

type DemoStep = 'intro' | 'cross-section' | 'velocity' | 'sedimentation' | 'report-preview';

// Powers Roundness Scale labels
const ROUNDNESS_LABELS = [
  { value: 1, label: "Very Angular" },
  { value: 2, label: "Angular" }, 
  { value: 3, label: "Sub-angular" },
  { value: 4, label: "Sub-rounded" },
  { value: 5, label: "Rounded" },
  { value: 6, label: "Well-rounded" }
];

// Demo data for the 5 existing River Dart sites
const DEMO_SITES = [
  {
    siteNumber: 1,
    siteName: "Upstream Meadow",
    riverWidth: 3.2,
    measurementPoints: [
      { distance: 0, depth: 0 },
      { distance: 0.8, depth: 0.4 },
      { distance: 1.6, depth: 0.8 },
      { distance: 2.4, depth: 0.6 },
      { distance: 3.2, depth: 0 }
    ],
    averageVelocity: 0.35,
    sedimentMeasurements: [
      { size_mm: 45, roundness: 3 },
      { size_mm: 52, roundness: 4 },
      { size_mm: 38, roundness: 3 }
    ],
    notes: "Shallow section with gravel bed, moderate flow through open meadowland"
  },
  {
    siteNumber: 2,
    siteName: "Bridge Crossing",
    riverWidth: 2.8,
    measurementPoints: [
      { distance: 0, depth: 0 },
      { distance: 0.7, depth: 0.6 },
      { distance: 1.4, depth: 1.2 },
      { distance: 2.1, depth: 0.8 },
      { distance: 2.8, depth: 0 }
    ],
    averageVelocity: 0.58,
    sedimentMeasurements: [
      { size_mm: 128, roundness: 2 },
      { size_mm: 156, roundness: 2 },
      { size_mm: 142, roundness: 3 }
    ],
    notes: "Narrower channel under stone bridge, deeper water with faster flow"
  },
  {
    siteNumber: 3,
    siteName: "Wooded Bend",
    riverWidth: 4.1,
    measurementPoints: [
      { distance: 0, depth: 0 },
      { distance: 1.0, depth: 0.3 },
      { distance: 2.0, depth: 0.7 },
      { distance: 3.1, depth: 0.5 },
      { distance: 4.1, depth: 0 }
    ],
    averageVelocity: 0.22,
    sedimentMeasurements: [
      { size_mm: 8, roundness: 4 },
      { size_mm: 12, roundness: 5 },
      { size_mm: 6, roundness: 4 }
    ],
    notes: "Wide meander through woodland, shallower with leaf litter on banks"
  },
  {
    siteNumber: 4,
    siteName: "Rocky Rapids",
    riverWidth: 2.5,
    measurementPoints: [
      { distance: 0, depth: 0 },
      { distance: 0.6, depth: 0.5 },
      { distance: 1.25, depth: 0.9 },
      { distance: 1.9, depth: 0.4 },
      { distance: 2.5, depth: 0 }
    ],
    averageVelocity: 0.84,
    sedimentMeasurements: [
      { size_mm: 380, roundness: 1 },
      { size_mm: 425, roundness: 2 },
      { size_mm: 356, roundness: 1 }
    ],
    notes: "Steep rocky section with turbulent flow over granite boulders"
  },
  {
    siteNumber: 5,
    siteName: "Village Outflow",
    riverWidth: 3.8,
    measurementPoints: [
      { distance: 0, depth: 0 },
      { distance: 0.95, depth: 0.4 },
      { distance: 1.9, depth: 0.8 },
      { distance: 2.85, depth: 0.6 },
      { distance: 3.8, depth: 0 }
    ],
    averageVelocity: 0.41,
    sedimentMeasurements: [
      { size_mm: 1.2, roundness: 5 },
      { size_mm: 0.8, roundness: 6 },
      { size_mm: 1.5, roundness: 5 }
    ],
    notes: "Wider section downstream of village, silty bed with slower flow"
  }
];

export function InteractivePreview({ onSignIn }: InteractivePreviewProps = {}) {
  const [currentStep, setCurrentStep] = useState<DemoStep>('intro');
  const [userSite, setUserSite] = useState<DemoSiteData>({
    siteName: "Site 6: Your Measurements",
    riverWidth: 0,
    measurementPoints: [],
    velocityMeasurements: [],
    averageVelocity: 0,
    sedimentMeasurements: []
  });
  const [numMeasurementPoints, setNumMeasurementPoints] = useState(3);
  const demoRef = useRef<HTMLDivElement>(null);

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSignUpClick = () => {
    if (onSignIn) {
      onSignIn();
    } else {
      // Fallback: scroll to auth if no sign-in function provided
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const startDemo = () => {
    setCurrentStep('cross-section');
    setTimeout(scrollToDemo, 100);
  };

  // Initialize measurement points when river width or number of points changes
  useEffect(() => {
    if (userSite.riverWidth > 0 && numMeasurementPoints > 0) {
      const newPoints: MeasurementPoint[] = [];
      for (let i = 0; i < numMeasurementPoints; i++) {
        const distance = (userSite.riverWidth / (numMeasurementPoints - 1)) * i;
        const existingPoint = userSite.measurementPoints.find(p => 
          Math.abs(p.distance - distance) < 0.01
        );
        newPoints.push({
          distance: distance,
          depth: existingPoint?.depth || 0
        });
      }
      setUserSite(prev => ({ ...prev, measurementPoints: newPoints }));
    }
  }, [userSite.riverWidth, numMeasurementPoints]);

  const calculateCrossSection = (points: MeasurementPoint[]) => {
    if (points.length < 2) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const width = points[i + 1].distance - points[i].distance;
      const avgDepth = (points[i].depth + points[i + 1].depth) / 2;
      area += width * avgDepth;
    }
    return area;
  };

  const updateMeasurementPoint = (index: number, depth: number) => {
    setUserSite(prev => ({
      ...prev,
      measurementPoints: prev.measurementPoints.map((point, i) => 
        i === index ? { ...point, depth } : point
      )
    }));
  };

  const addVelocityMeasurement = () => {
    setUserSite(prev => ({
      ...prev,
      velocityMeasurements: [
        ...prev.velocityMeasurements,
        { time: 0, distance: 10, velocity: 0 }
      ]
    }));
  };

  const updateVelocityMeasurement = (index: number, field: keyof VelocityMeasurement, value: number) => {
    setUserSite(prev => ({
      ...prev,
      velocityMeasurements: prev.velocityMeasurements.map((measurement, i) => {
        if (i === index) {
          const updated = { ...measurement, [field]: value };
          // Calculate velocity if time and distance are set
          if (updated.time > 0 && updated.distance > 0) {
            updated.velocity = updated.distance / updated.time;
          }
          return updated;
        }
        return measurement;
      })
    }));
  };

  // Calculate average velocity
  useEffect(() => {
    const validMeasurements = userSite.velocityMeasurements.filter(m => m.velocity > 0);
    const avg = validMeasurements.length > 0 
      ? validMeasurements.reduce((sum, m) => sum + m.velocity, 0) / validMeasurements.length
      : 0;
    setUserSite(prev => ({ ...prev, averageVelocity: avg }));
  }, [userSite.velocityMeasurements]);

  const addSedimentMeasurement = () => {
    setUserSite(prev => ({
      ...prev,
      sedimentMeasurements: [
        ...prev.sedimentMeasurements,
        { size_mm: 0, roundness: 1 }
      ]
    }));
  };

  const updateSedimentMeasurement = (index: number, field: keyof SedimentMeasurement, value: number) => {
    setUserSite(prev => ({
      ...prev,
      sedimentMeasurements: prev.sedimentMeasurements.map((measurement, i) => 
        i === index ? { ...measurement, [field]: value } : measurement
      )
    }));
  };

  // Generate cross-section chart data
  const getCrossSectionChartData = () => {
    if (userSite.measurementPoints.length < 2) return null;

    const maxDepth = Math.max(...userSite.measurementPoints.map(p => p.depth));
    const bankExtension = maxDepth + 0.5; // Extend banks below deepest point

    return {
      data: [
        // Brown underground area
        {
          x: [0, ...userSite.measurementPoints.map(p => p.distance), userSite.riverWidth, userSite.riverWidth, 0, 0],
          y: [0, ...userSite.measurementPoints.map(p => -p.depth), 0, -bankExtension, -bankExtension, 0],
          fill: 'toself' as any,
          type: 'scatter' as any,
          mode: 'none' as any,
          name: 'Underground',
          fillcolor: 'peru',
          line: { width: 0 },
          showlegend: false
        },
        // Water area
        {
          x: [0, ...userSite.measurementPoints.map(p => p.distance), userSite.riverWidth],
          y: [0, ...userSite.measurementPoints.map(p => -p.depth), 0],
          fill: 'tozeroy' as any,
          type: 'scatter' as any,
          mode: 'none' as any,
          name: 'Water',
          fillcolor: 'lightblue',
          line: { width: 0 },
          showlegend: false
        },
        // River bed line
        {
          x: userSite.measurementPoints.map(p => p.distance),
          y: userSite.measurementPoints.map(p => -p.depth),
          type: 'scatter' as any,
          mode: 'lines+markers' as any,
          name: 'River Bed',
          line: { color: 'royalblue', width: 2 },
          marker: { color: 'darkblue', size: 8 },
          showlegend: false
        },
        // Water surface line
        {
          x: [0, userSite.riverWidth],
          y: [0, 0],
          type: 'scatter' as any,
          mode: 'lines' as any,
          name: 'Water Surface',
          line: { color: 'lightblue', width: 2 },
          showlegend: false
        }
      ],
      layout: {
        title: { text: 'Live Cross-Section' },
        xaxis: { title: { text: 'Distance from bank (m)' } },
        yaxis: { title: { text: 'Depth (m)' } },
        plot_bgcolor: 'lightcyan',
        paper_bgcolor: 'lightcyan',
        showlegend: false,
        height: 300,
        margin: { t: 50, r: 50, b: 50, l: 50 }
      }
    };
  };

  // Generate wind rose chart for sedimentation
  const getWindRoseChartData = () => {
    if (userSite.sedimentMeasurements.length === 0) return null;

    const roundnessCounts = Array(6).fill(0);
    userSite.sedimentMeasurements.forEach(m => {
      if (m.roundness >= 1 && m.roundness <= 6) {
        roundnessCounts[m.roundness - 1]++;
      }
    });

    const angles = [0, 60, 120, 180, 240, 300];
    
    return {
      data: [{
        type: 'barpolar' as any,
        r: roundnessCounts,
        theta: angles,
        name: 'Roundness Distribution',
        marker: {
          color: roundnessCounts.map((_, i) => `hsl(${i * 60}, 70%, 50%)`),
          line: { color: 'white', width: 1 }
        }
      }],
      layout: {
        title: { text: 'Sediment Roundness Distribution' },
        polar: {
          radialaxis: { 
            visible: true,
            range: [0, Math.max(...roundnessCounts) + 1]
          },
          angularaxis: {
            tickvals: angles,
            ticktext: ROUNDNESS_LABELS.map(l => l.label)
          }
        },
        showlegend: false,
        height: 400,
        margin: { t: 50, r: 50, b: 50, l: 50 }
      }
    };
  };

  // Intro step
  if (currentStep === 'intro') {
    return (
      <div ref={demoRef} className="max-w-4xl mx-auto text-center">
        <div className="glass rounded-2xl p-8 mb-8 bg-gray-900/80 backdrop-blur-md">
          <h2 className="text-3xl font-bold text-white mb-4">
            Try It Yourself! 🎯
          </h2>
          <p className="text-gray-100 text-lg mb-6 max-w-2xl mx-auto">
            Experience the full Riverwalks workflow! You'll complete Site 6 of our River Dart study 
            using the exact same 4-step process as the main app, with live charts updating as you enter data.
          </p>
          
          <div className="flex justify-center mb-8">
            <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/50 max-w-md">
              <h3 className="text-white font-semibold mb-3 text-center">📊 4-Step Process</h3>
              <ul className="text-gray-200 text-left space-y-2">
                <li>• Cross-sectional measurements with live chart</li>
                <li>• Velocity timing with instant calculations</li>
                <li>• Sediment analysis with wind rose visualization</li>
                <li>• Full report generation with all 6 sites</li>
              </ul>
            </div>
          </div>
          
          <button
            onClick={startDemo}
            className="btn-primary px-8 py-4 text-lg font-semibold rounded-xl flex items-center gap-3 mx-auto hover:scale-105 transition-transform"
          >
            <Play className="w-5 h-5" />
            Start Site 6 Measurements
          </button>
        </div>
      </div>
    );
  }

  // Cross-section step
  if (currentStep === 'cross-section') {
    const chartData = getCrossSectionChartData();
    const crossSectionArea = calculateCrossSection(userSite.measurementPoints);
    
    return (
      <div ref={demoRef} className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Entry Side */}
          <div className="glass rounded-2xl p-6 bg-gray-900/80 backdrop-blur-md">
            <h3 className="text-2xl font-bold text-white mb-4">
              Step 1: Cross-Sectional Area
            </h3>
            
            <div className="space-y-6">
              <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 mb-4">
                <p className="text-blue-200 text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden lg:inline">💡 Watch the live cross-section chart update as you enter measurements on the right →</span>
                  <span className="lg:hidden">💡 Live chart updates below as you enter measurements ↓</span>
                </p>
              </div>
              
              <div>
                <label className="block text-white/90 font-medium mb-2">River Width (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={userSite.riverWidth || ''}
                  onChange={(e) => setUserSite(prev => ({ ...prev, riverWidth: parseFloat(e.target.value) || 0 }))}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-center"
                  placeholder=""
                />
              </div>
              
              <div>
                <label className="block text-white/90 font-medium mb-2">Number of Measurement Points</label>
                <select
                  value={numMeasurementPoints}
                  onChange={(e) => setNumMeasurementPoints(parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  {[3, 4, 5].map(num => (
                    <option key={num} value={num}>{num} points</option>
                  ))}
                </select>
              </div>
              
              {userSite.riverWidth > 0 && userSite.measurementPoints.length > 0 && (
                <div>
                  <h4 className="text-white/90 font-medium mb-3">Depth Measurements</h4>
                  <div className="space-y-3">
                    {userSite.measurementPoints.map((point, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-white/80 text-sm w-20">
                          {point.distance.toFixed(1)}m:
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          value={point.depth || ''}
                          onChange={(e) => updateMeasurementPoint(index, parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-center"
                          placeholder=""
                        />
                        <span className="text-white/60 text-sm">m deep</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {crossSectionArea > 0 && (
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Calculated Area</h4>
                  <p className="text-white/90 text-lg">{crossSectionArea.toFixed(2)} m²</p>
                </div>
              )}
              
              {userSite.measurementPoints.length > 0 && userSite.measurementPoints.some(p => p.depth > 0) && (
                <button
                  onClick={() => {
                    setCurrentStep('velocity');
                    setTimeout(scrollToDemo, 100);
                  }}
                  className="w-full btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  Continue to Velocity Measurements
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Live Chart Side */}
          <div className="glass rounded-2xl p-6 bg-gray-900/80 backdrop-blur-md">
            <h3 className="text-2xl font-bold text-white mb-4">
              Live Cross-Section Chart
            </h3>
            
            <div className="bg-white/5 rounded-xl p-4">
              {chartData ? (
                <Plot
                  data={chartData.data}
                  layout={chartData.layout}
                  style={{ width: '100%', height: '100%' }}
                  config={{ displayModeBar: false, responsive: true }}
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-white/60">
                  Enter river width and depths to see the live cross-section chart
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Velocity step
  if (currentStep === 'velocity') {
    return (
      <div ref={demoRef} className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Entry Side */}
          <div className="glass rounded-2xl p-6 bg-gray-900/80 backdrop-blur-md">
            <h3 className="text-2xl font-bold text-white mb-4">
              Step 2: Velocity Measurements
            </h3>
            
            <div className="space-y-6">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white/90 text-sm">
                  Time how long it takes for a float to travel 10 meters downstream. 
                  Take 3 measurements for accuracy.
                </p>
              </div>
              
              <div>
                <h4 className="text-white/90 font-medium mb-3">Float Timing</h4>
                <div className="space-y-3">
                  {userSite.velocityMeasurements.map((measurement, index) => (
                    <div key={index} className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-white/80 text-sm mb-1">Time (s)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={measurement.time || ''}
                          onChange={(e) => updateVelocityMeasurement(index, 'time', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-center"
                          placeholder=""
                        />
                      </div>
                      <div>
                        <label className="block text-white/80 text-sm mb-1">Distance (m)</label>
                        <input
                          type="number"
                          value={measurement.distance}
                          onChange={(e) => updateVelocityMeasurement(index, 'distance', parseFloat(e.target.value) || 10)}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-white/80 text-sm mb-1">Velocity (m/s)</label>
                        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white/80">
                          {measurement.velocity.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {userSite.velocityMeasurements.length < 3 && (
                  <button
                    onClick={addVelocityMeasurement}
                    className="mt-3 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
                  >
                    Add Measurement
                  </button>
                )}
              </div>
              
              {userSite.velocityMeasurements.length > 0 && userSite.averageVelocity > 0 && (
                <button
                  onClick={() => {
                    setCurrentStep('sedimentation');
                    setTimeout(scrollToDemo, 100);
                  }}
                  className="w-full btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  Continue to Sediment Analysis
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Live Metrics Side */}
          <div className="glass rounded-2xl p-6 bg-gray-900/80 backdrop-blur-md">
            <h3 className="text-2xl font-bold text-white mb-4">
              Live Velocity Analysis
            </h3>
            
            <div className="bg-white/5 rounded-xl p-4 space-y-4">
              {userSite.averageVelocity > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">Average Velocity</h4>
                    <p className="text-white/90 text-2xl">{userSite.averageVelocity.toFixed(2)} m/s</p>
                  </div>
                  
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">Discharge (Q = A × V)</h4>
                    <p className="text-white/90 text-2xl">
                      {(calculateCrossSection(userSite.measurementPoints) * userSite.averageVelocity).toFixed(3)} m³/s
                    </p>
                  </div>
                </div>
              )}
              
              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Individual Measurements</h4>
                <div className="space-y-2">
                  {userSite.velocityMeasurements.map((measurement, index) => (
                    <div key={index} className="flex justify-between text-white/80">
                      <span>Measurement {index + 1}:</span>
                      <span>{measurement.velocity.toFixed(2)} m/s</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sedimentation step
  if (currentStep === 'sedimentation') {
    const windRoseData = getWindRoseChartData();
    
    return (
      <div ref={demoRef} className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Entry Side */}
          <div className="glass rounded-2xl p-6 bg-gray-900/80 backdrop-blur-md">
            <h3 className="text-2xl font-bold text-white mb-4">
              Step 3: Sediment Analysis
            </h3>
            
            <div className="space-y-6">
              {/* Powers Roundness Scale */}
              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="text-white/90 font-medium mb-3">Powers Roundness Scale</h4>
                <div className="flex justify-center">
                  <img 
                    src="/powers_roundness_scale.png" 
                    alt="Powers Roundness Scale - Visual guide for sediment roundness classification from 1 (Very Angular) to 6 (Well-rounded)" 
                    className="max-w-full h-auto rounded-lg bg-white/10 p-2"
                  />
                </div>
              </div>
              
              <div>
                <h4 className="text-white/90 font-medium mb-3">Sediment Measurements</h4>
                <div className="space-y-3">
                  {userSite.sedimentMeasurements.map((measurement, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3">
                      <h5 className="text-white/90 text-sm font-medium mb-2">Measurement {index + 1}</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-white/80 text-sm mb-1">Size (mm)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={measurement.size_mm || ''}
                            onChange={(e) => updateSedimentMeasurement(index, 'size_mm', parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-center"
                            placeholder=""
                          />
                        </div>
                        <div>
                          <label className="block text-white/80 text-sm mb-1">Roundness (1-6)</label>
                          <select
                            value={measurement.roundness}
                            onChange={(e) => updateSedimentMeasurement(index, 'roundness', parseInt(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                          >
                            {ROUNDNESS_LABELS.map(item => (
                              <option key={item.value} value={item.value}>
                                {item.value} - {item.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {userSite.sedimentMeasurements.length < 5 && (
                  <button
                    onClick={addSedimentMeasurement}
                    className="mt-3 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
                  >
                    Add Sediment Sample
                  </button>
                )}
              </div>
              
              {userSite.sedimentMeasurements.length > 0 && userSite.sedimentMeasurements.some(m => m.size_mm > 0) && (
                <button
                  onClick={() => {
                    setCurrentStep('report-preview');
                    setTimeout(scrollToDemo, 100);
                  }}
                  className="w-full btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  Generate Complete Report
                  <FileText className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Live Wind Rose Chart Side */}
          <div className="glass rounded-2xl p-6 bg-gray-900/80 backdrop-blur-md">
            <h3 className="text-2xl font-bold text-white mb-4">
              Live Sediment Analysis
            </h3>
            
            <div className="bg-white/5 rounded-xl p-4">
              {windRoseData ? (
                <Plot
                  data={windRoseData.data}
                  layout={windRoseData.layout}
                  style={{ width: '100%', height: '100%' }}
                  config={{ displayModeBar: false, responsive: true }}
                />
              ) : (
                <div className="h-96 flex items-center justify-center text-white/60">
                  Add sediment measurements to see the wind rose distribution chart
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Report preview step
  if (currentStep === 'report-preview') {
    const hasValidData = userSite.riverWidth > 0 && 
                        userSite.measurementPoints.some(p => p.depth > 0) &&
                        userSite.averageVelocity > 0 &&
                        userSite.sedimentMeasurements.length > 0;

    // Calculate all sites data including user's site
    const allSites = [...DEMO_SITES, {
      siteNumber: 6,
      siteName: userSite.siteName,
      riverWidth: userSite.riverWidth,
      measurementPoints: userSite.measurementPoints,
      averageVelocity: userSite.averageVelocity,
      sedimentMeasurements: userSite.sedimentMeasurements,
      notes: "Final downstream measurement point"
    }];

    const studyStats = {
      totalSites: allSites.length,
      totalArea: allSites.reduce((sum, site) => sum + calculateCrossSection(site.measurementPoints), 0),
      avgVelocity: allSites.reduce((sum, site) => sum + site.averageVelocity, 0) / allSites.length,
      totalDischarge: allSites.reduce((sum, site) => sum + (calculateCrossSection(site.measurementPoints) * site.averageVelocity), 0),
      avgSedimentSize: allSites.flatMap(s => s.sedimentMeasurements).reduce((sum, sed) => sum + sed.size_mm, 0) / allSites.flatMap(s => s.sedimentMeasurements).length
    };

    return (
      <div ref={demoRef} className="max-w-7xl mx-auto">
        <div className="glass rounded-2xl p-8 bg-gray-900/80 backdrop-blur-md">
          {/* Report Header */}
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-white mb-2">
              📋 Example Report Preview
            </h3>
            <p className="text-white/80 text-lg">Complete 6-Site Longitudinal Analysis</p>
            <p className="text-white/60 text-sm">Devon, United Kingdom • June 2024</p>
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 mt-4">
              <p className="text-blue-200 text-sm">
                ⚡ <strong>Demo Report:</strong> This is a simplified preview. Real reports include much more detail.
              </p>
            </div>
          </div>

          {/* Study KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{studyStats.totalSites}</div>
              <div className="text-white/80 text-sm">Study Sites</div>
            </div>
            <div className="bg-green-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{studyStats.totalArea.toFixed(1)}m²</div>
              <div className="text-white/80 text-sm">Total Area</div>
            </div>
            <div className="bg-purple-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{studyStats.avgVelocity.toFixed(2)}m/s</div>
              <div className="text-white/80 text-sm">Avg Velocity</div>
            </div>
            <div className="bg-orange-500/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{studyStats.totalDischarge.toFixed(3)}m³/s</div>
              <div className="text-white/80 text-sm">Total Discharge</div>
            </div>
          </div>

          {/* Sites Summary Table */}
          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <h4 className="text-white font-semibold mb-4">📊 Site Summary Analysis</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-white/90 text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-2 px-3">Site</th>
                    <th className="text-right py-2 px-3">Width (m)</th>
                    <th className="text-right py-2 px-3">Area (m²)</th>
                    <th className="text-right py-2 px-3">Velocity (m/s)</th>
                    <th className="text-right py-2 px-3">Discharge (m³/s)</th>
                    <th className="text-right py-2 px-3">Sediment (mm)</th>
                    <th className="text-left py-2 px-3">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {allSites.map((site, index) => {
                    const area = calculateCrossSection(site.measurementPoints);
                    const discharge = area * site.averageVelocity;
                    const avgSedSize = site.sedimentMeasurements.length > 0 ? 
                      site.sedimentMeasurements.reduce((sum, s) => sum + s.size_mm, 0) / site.sedimentMeasurements.length : 0;
                    
                    const locationTypes = ['Meadow', 'Bridge', 'Bend', 'Rapids', 'Outflow', 'Your Site'];
                    
                    return (
                      <tr key={index} className={`border-b border-white/10 ${index === 5 ? 'bg-blue-500/10' : ''}`}>
                        <td className="py-2 px-3 font-medium">{site.siteNumber}</td>
                        <td className="py-2 px-3 text-right">{site.riverWidth.toFixed(1)}</td>
                        <td className="py-2 px-3 text-right">{area.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">{site.averageVelocity.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">{discharge.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right">{avgSedSize.toFixed(1)}</td>
                        <td className="py-2 px-3">{locationTypes[index]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasValidData && (
              <p className="text-blue-300 text-xs mt-2">✨ "Your Site" highlighted - this shows your data integrated into the complete study!</p>
            )}
          </div>

          {/* Key Findings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white/5 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-4">🔍 Key Findings</h4>
              <div className="space-y-3 text-white/80 text-sm">
                <div className="flex justify-between">
                  <span>Fastest flow:</span>
                  <span className="text-white font-medium">Site 4 (Rapids) - 0.84 m/s</span>
                </div>
                <div className="flex justify-between">
                  <span>Deepest point:</span>
                  <span className="text-white font-medium">Site 2 (Bridge) - 1.2m depth</span>
                </div>
                <div className="flex justify-between">
                  <span>Largest sediment:</span>
                  <span className="text-white font-medium">Site 4 - Boulders (425mm avg)</span>
                </div>
                <div className="flex justify-between">
                  <span>Finest sediment:</span>
                  <span className="text-white font-medium">Site 5 - Sand/Silt (1.2mm avg)</span>
                </div>
                <div className="flex justify-between">
                  <span>Total river length studied:</span>
                  <span className="text-white font-medium">~2.1km downstream</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-4">📈 Downstream Trends</h4>
              <div className="space-y-3 text-white/80 text-sm">
                <div>
                  <span className="text-white font-medium">Velocity Pattern:</span>
                  <p>Increases through constricted areas (Sites 2,4) then decreases in wide sections</p>
                </div>
                <div>
                  <span className="text-white font-medium">Sediment Size:</span>
                  <p>Clear downstream fining from boulders to sand/silt - classic river profile</p>
                </div>
                <div>
                  <span className="text-white font-medium">Channel Width:</span>
                  <p>Varies with topography: narrow at bridge/rapids, wide in bends/meadows</p>
                </div>
                <div>
                  <span className="text-white font-medium">Discharge:</span>
                  <p>Relatively consistent despite width variations due to velocity compensation</p>
                </div>
              </div>
            </div>
          </div>

          {/* Report Sections Preview */}
          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <h4 className="text-white font-semibold mb-4">📑 Full Report Includes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Executive Summary & Methodology</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>GPS Site Location Maps</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Individual Cross-Section Charts</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Velocity & Discharge Analysis</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Sediment Wind Rose Charts</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Statistical Correlations</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Longitudinal Profile Analysis</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>GCSE Geography Coursework Ready</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-4">
            <p className="text-white/90 text-lg">
              This professional report combines all 6 sites into a comprehensive analysis perfect for 
              GCSE Geography coursework. The real app generates this as a downloadable PDF.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setCurrentStep('intro');
                  setUserSite({
                    siteName: "Site 6: Your Measurements",
                    riverWidth: 0,
                    measurementPoints: [],
                    velocityMeasurements: [],
                    averageVelocity: 0,
                    sedimentMeasurements: []
                  });
                  setNumMeasurementPoints(3);
                }}
                className="px-6 py-3 border border-white/30 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2 justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Try Again
              </button>
              
              <button 
                onClick={handleSignUpClick}
                className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign me up with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}