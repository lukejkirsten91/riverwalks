import { useState, useEffect } from 'react';
import { Play, ChevronRight, FileText, ArrowRight, ArrowLeft, MapPin } from 'lucide-react';
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

export function InteractivePreview() {
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

  const startDemo = () => {
    setCurrentStep('cross-section');
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

    return {
      data: [
        {
          x: userSite.measurementPoints.map(p => p.distance),
          y: userSite.measurementPoints.map(p => -p.depth), // Negative for depth below surface
          fill: 'tonexty' as any,
          type: 'scatter' as any,
          mode: 'lines+markers' as any,
          name: 'River Bed',
          line: { color: '#8B4513', width: 2 },
          fillcolor: '#D2691E'
        },
        {
          x: [0, userSite.riverWidth],
          y: [0, 0],
          type: 'scatter' as any,
          mode: 'lines' as any,
          name: 'Water Surface',
          line: { color: '#4A90E2', width: 3 }
        }
      ],
      layout: {
        title: { text: 'Live Cross-Section' },
        xaxis: { title: { text: 'Distance from bank (m)' } },
        yaxis: { title: { text: 'Depth (m)' } },
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
        height: 400,
        margin: { t: 50, r: 50, b: 50, l: 50 }
      }
    };
  };

  // Intro step
  if (currentStep === 'intro') {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <div className="glass rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Try It Yourself! 🎯
          </h2>
          <p className="text-white/90 text-lg mb-6 max-w-2xl mx-auto">
            Experience the full Riverwalks workflow! You'll complete Site 6 of our River Dart study 
            using the exact same 4-step process as the main app, with live charts updating as you enter data.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3">📊 4-Step Process</h3>
              <ul className="text-white/80 text-left space-y-2">
                <li>• Cross-sectional measurements with live chart</li>
                <li>• Velocity timing with instant calculations</li>
                <li>• Sediment analysis with wind rose visualization</li>
                <li>• Full report generation with all 6 sites</li>
              </ul>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3">🌊 River Dart Study</h3>
              <ul className="text-white/80 text-left space-y-2">
                <li>• 5 sites already completed with real data</li>
                <li>• From Devon moorland to village outflow</li>
                <li>• You'll complete the final downstream site</li>
                <li>• Same tools and charts as the main app</li>
              </ul>
            </div>
          </div>
          
          <button
            onClick={startDemo}
            className="btn-primary px-8 py-4 text-lg font-semibold rounded-xl flex items-center gap-3 mx-auto hover:scale-105 transition-transform"
          >
            <Play className="w-5 h-5" />
            Start Site 6 Measurements
            <ChevronRight className="w-5 h-5" />
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
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Entry Side */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">
              Step 1: Cross-Sectional Area
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-white/90 font-medium mb-2">River Width (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={userSite.riverWidth || ''}
                  onChange={(e) => setUserSite(prev => ({ ...prev, riverWidth: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                  placeholder="3.5"
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
                          className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                          placeholder="0.0"
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
                  onClick={() => setCurrentStep('velocity')}
                  className="w-full btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  Continue to Velocity Measurements
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Live Chart Side */}
          <div className="glass rounded-2xl p-6">
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
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Entry Side */}
          <div className="glass rounded-2xl p-6">
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
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                          placeholder="12.5"
                        />
                      </div>
                      <div>
                        <label className="block text-white/80 text-sm mb-1">Distance (m)</label>
                        <input
                          type="number"
                          value={measurement.distance}
                          onChange={(e) => updateVelocityMeasurement(index, 'distance', parseFloat(e.target.value) || 10)}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
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
                  onClick={() => setCurrentStep('sedimentation')}
                  className="w-full btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  Continue to Sediment Analysis
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Live Metrics Side */}
          <div className="glass rounded-2xl p-6">
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
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Entry Side */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">
              Step 3: Sediment Analysis
            </h3>
            
            <div className="space-y-6">
              {/* Powers Roundness Scale */}
              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="text-white/90 font-medium mb-3">Powers Roundness Scale</h4>
                <div className="grid grid-cols-3 gap-2 text-xs text-white/80">
                  {ROUNDNESS_LABELS.map(item => (
                    <div key={item.value} className="text-center">
                      <div className="font-medium">{item.value}</div>
                      <div>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-white/90 font-medium mb-3">Sediment Measurements</h4>
                <div className="space-y-3">
                  {userSite.sedimentMeasurements.map((measurement, index) => (
                    <div key={index} className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-white/80 text-sm mb-1">Size (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={measurement.size_mm || ''}
                          onChange={(e) => updateSedimentMeasurement(index, 'size_mm', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                          placeholder="25.5"
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
                  onClick={() => setCurrentStep('report-preview')}
                  className="w-full btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  Generate Complete Report
                  <FileText className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Live Wind Rose Chart Side */}
          <div className="glass rounded-2xl p-6">
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

    return (
      <div className="max-w-6xl mx-auto">
        <div className="glass rounded-2xl p-8">
          <h3 className="text-3xl font-bold text-white mb-6 text-center">
            🎉 Complete River Study Report
          </h3>
          
          {/* Report Preview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Your Data Summary */}
            <div className="bg-white/5 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                📊 Your Site 6 Contribution
              </h4>
              {hasValidData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/70 text-sm">River Width</p>
                      <p className="text-white font-semibold">{userSite.riverWidth}m</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/70 text-sm">Cross-section</p>
                      <p className="text-white font-semibold">{calculateCrossSection(userSite.measurementPoints).toFixed(2)}m²</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/70 text-sm">Avg Velocity</p>
                      <p className="text-white font-semibold">{userSite.averageVelocity.toFixed(2)}m/s</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/70 text-sm">Discharge</p>
                      <p className="text-white font-semibold">{(calculateCrossSection(userSite.measurementPoints) * userSite.averageVelocity).toFixed(3)}m³/s</p>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-white/70 text-sm">Sediment Samples</p>
                    <p className="text-white font-semibold">{userSite.sedimentMeasurements.length} measurements collected</p>
                  </div>
                </div>
              ) : (
                <p className="text-white/70">Complete all measurements to see your data summary</p>
              )}
            </div>

            {/* Report Contents */}
            <div className="bg-white/5 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                📑 Professional PDF Report
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Executive Summary & Methodology</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Site Location Maps (GPS coordinates)</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Cross-section Charts (all 6 sites)</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Velocity & Discharge Analysis</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Sediment Distribution Patterns</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Statistical Correlations</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>GCSE Geography Coursework Ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* River Dart Study Context */}
          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <h4 className="text-white font-semibold mb-4">Complete River Dart Study</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <h5 className="text-white font-medium mb-2">5 Existing Sites</h5>
                <ul className="text-white/80 text-sm space-y-1">
                  <li>• Upstream Meadow</li>
                  <li>• Bridge Crossing</li>
                  <li>• Wooded Bend</li>
                  <li>• Rocky Rapids</li>
                  <li>• Village Outflow</li>
                </ul>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <h5 className="text-white font-medium mb-2">Your Site 6</h5>
                <p className="text-white/80 text-sm">
                  The final downstream measurement point, completing the comprehensive study 
                  of the River Dart from Devon moorland to village outflow.
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <h5 className="text-white font-medium mb-2">Study Impact</h5>
                <p className="text-white/80 text-sm">
                  Your measurements complete a longitudinal profile showing how river 
                  characteristics change downstream - perfect for coursework analysis.
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-4">
            <p className="text-white/90 text-lg">
              Ready to create your own professional river studies? The real app includes 
              GPS mapping, offline data collection, and instant PDF generation.
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
              
              <button className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Start Your Real River Study
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}