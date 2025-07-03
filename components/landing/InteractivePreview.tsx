import { useState, useEffect } from 'react';
import { Play, ChevronRight, FileText } from 'lucide-react';

interface SiteData {
  siteName: string;
  riverWidth: number;
  measurementPoints: Array<{
    distance: number;
    depth: number;
  }>;
  velocity?: number;
  sedimentSize?: string;
}

const EXAMPLE_SITES: SiteData[] = [
  {
    siteName: "Upstream Meadow",
    riverWidth: 3.2,
    measurementPoints: [
      { distance: 0, depth: 0 },
      { distance: 0.8, depth: 0.4 },
      { distance: 1.6, depth: 0.8 },
      { distance: 2.4, depth: 0.6 },
      { distance: 3.2, depth: 0 }
    ],
    velocity: 0.35,
    sedimentSize: "Pebble"
  },
  {
    siteName: "Bridge Crossing",
    riverWidth: 2.8,
    measurementPoints: [
      { distance: 0, depth: 0 },
      { distance: 0.7, depth: 0.6 },
      { distance: 1.4, depth: 1.2 },
      { distance: 2.1, depth: 0.8 },
      { distance: 2.8, depth: 0 }
    ],
    velocity: 0.58,
    sedimentSize: "Cobble"
  },
  {
    siteName: "Wooded Bend",
    riverWidth: 4.1,
    measurementPoints: [
      { distance: 0, depth: 0 },
      { distance: 1.0, depth: 0.3 },
      { distance: 2.0, depth: 0.7 },
      { distance: 3.1, depth: 0.5 },
      { distance: 4.1, depth: 0 }
    ],
    velocity: 0.22,
    sedimentSize: "Granule"
  },
  {
    siteName: "Rocky Rapids",
    riverWidth: 2.5,
    measurementPoints: [
      { distance: 0, depth: 0 },
      { distance: 0.6, depth: 0.5 },
      { distance: 1.25, depth: 0.9 },
      { distance: 1.9, depth: 0.4 },
      { distance: 2.5, depth: 0 }
    ],
    velocity: 0.84,
    sedimentSize: "Boulder"
  },
  {
    siteName: "Village Outflow",
    riverWidth: 3.8,
    measurementPoints: [
      { distance: 0, depth: 0 },
      { distance: 0.95, depth: 0.4 },
      { distance: 1.9, depth: 0.8 },
      { distance: 2.85, depth: 0.6 },
      { distance: 3.8, depth: 0 }
    ],
    velocity: 0.41,
    sedimentSize: "Sand"
  }
];

export function InteractivePreview() {
  const [currentStep, setCurrentStep] = useState<'intro' | 'demo' | 'results'>('intro');
  const [userSite, setUserSite] = useState<SiteData>({
    siteName: "Your Study Site",
    riverWidth: 0,
    measurementPoints: [],
    velocity: undefined,
    sedimentSize: undefined
  });

  const startDemo = () => {
    setCurrentStep('demo');
  };

  const calculateCrossSection = (site: SiteData) => {
    if (site.measurementPoints.length < 2) return 0;
    
    let area = 0;
    for (let i = 0; i < site.measurementPoints.length - 1; i++) {
      const width = site.measurementPoints[i + 1].distance - site.measurementPoints[i].distance;
      const avgDepth = (site.measurementPoints[i].depth + site.measurementPoints[i + 1].depth) / 2;
      area += width * avgDepth;
    }
    return area;
  };

  const generateMiniReport = () => {
    const allSites = [...EXAMPLE_SITES, userSite];
    const totalArea = allSites.reduce((sum, site) => sum + calculateCrossSection(site), 0);
    const avgVelocity = allSites.filter(s => s.velocity).reduce((sum, site) => sum + (site.velocity || 0), 0) / allSites.filter(s => s.velocity).length;
    
    return {
      totalSites: allSites.length,
      totalArea: totalArea.toFixed(2),
      avgVelocity: avgVelocity.toFixed(2),
      discharge: (totalArea * avgVelocity).toFixed(3)
    };
  };

  const updateUserSite = (field: keyof SiteData, value: any) => {
    setUserSite(prev => ({ ...prev, [field]: value }));
  };

  const addMeasurementPoint = () => {
    const newDistance = userSite.riverWidth / Math.max(1, userSite.measurementPoints.length);
    setUserSite(prev => ({
      ...prev,
      measurementPoints: [
        ...prev.measurementPoints,
        { distance: newDistance * prev.measurementPoints.length, depth: 0 }
      ]
    }));
  };

  if (currentStep === 'intro') {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <div className="glass rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Try It Yourself! 🎯
          </h2>
          <p className="text-white/90 text-lg mb-6 max-w-2xl mx-auto">
            Experience how Riverwalks works with real data. You'll add measurements to the 6th site 
            of an actual river study, then see your data come alive in a professional report.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3">📊 What You'll Do</h3>
              <ul className="text-white/80 text-left space-y-2">
                <li>• Enter river width measurements</li>
                <li>• Add depth readings across the channel</li>
                <li>• Record velocity and sediment data</li>
                <li>• Watch the report update in real-time</li>
              </ul>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3">🌊 Example River</h3>
              <ul className="text-white/80 text-left space-y-2">
                <li>• 5 sites already completed</li>
                <li>• River Dart, Devon</li>
                <li>• Mixed terrain and conditions</li>
                <li>• Real GCSE-style data</li>
              </ul>
            </div>
          </div>
          
          <button
            onClick={startDemo}
            className="btn-primary px-8 py-4 text-lg font-semibold rounded-xl flex items-center gap-3 mx-auto hover:scale-105 transition-transform"
          >
            <Play className="w-5 h-5" />
            Start Interactive Demo
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'demo') {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Entry Side */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">
              Site 6: Data Entry
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-white/90 font-medium mb-2">Site Name</label>
                <input
                  type="text"
                  value={userSite.siteName}
                  onChange={(e) => updateUserSite('siteName', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                  placeholder="e.g., Downstream Pool"
                />
              </div>
              
              <div>
                <label className="block text-white/90 font-medium mb-2">River Width (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={userSite.riverWidth || ''}
                  onChange={(e) => updateUserSite('riverWidth', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                  placeholder="3.5"
                />
              </div>
              
              <div>
                <label className="block text-white/90 font-medium mb-2">Average Velocity (m/s)</label>
                <input
                  type="number"
                  step="0.01"
                  value={userSite.velocity || ''}
                  onChange={(e) => updateUserSite('velocity', parseFloat(e.target.value) || undefined)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                  placeholder="0.45"
                />
              </div>
              
              <div>
                <label className="block text-white/90 font-medium mb-2">Dominant Sediment</label>
                <select
                  value={userSite.sedimentSize || ''}
                  onChange={(e) => updateUserSite('sedimentSize', e.target.value || undefined)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  <option value="">Select sediment type</option>
                  <option value="Boulder">Boulder (&gt;256mm)</option>
                  <option value="Cobble">Cobble (64-256mm)</option>
                  <option value="Pebble">Pebble (4-64mm)</option>
                  <option value="Granule">Granule (2-4mm)</option>
                  <option value="Sand">Sand (0.06-2mm)</option>
                  <option value="Silt">Silt (&lt;0.06mm)</option>
                </select>
              </div>
              
              {userSite.riverWidth > 0 && userSite.velocity && userSite.sedimentSize && (
                <button
                  onClick={() => setCurrentStep('results')}
                  className="w-full btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  Generate Live Report
                </button>
              )}
            </div>
          </div>
          
          {/* Live Preview Side */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">
              Live Report Preview
            </h3>
            
            <div className="bg-white/5 rounded-xl p-4 space-y-4">
              <div className="text-white/70 text-sm">
                Summary will update as you enter data...
              </div>
              
              {userSite.riverWidth > 0 && (
                <div className="bg-white/10 rounded-lg p-3">
                  <h4 className="text-white font-medium">Site 6: {userSite.siteName}</h4>
                  <p className="text-white/80 text-sm">Width: {userSite.riverWidth}m</p>
                  {userSite.velocity && (
                    <p className="text-white/80 text-sm">Velocity: {userSite.velocity}m/s</p>
                  )}
                  {userSite.sedimentSize && (
                    <p className="text-white/80 text-sm">Sediment: {userSite.sedimentSize}</p>
                  )}
                </div>
              )}
              
              <div className="text-white/50 text-xs">
                Complete the form to see the full report with charts and analysis!
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results view
  const reportData = generateMiniReport();
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass rounded-2xl p-8">
        <h3 className="text-3xl font-bold text-white mb-6 text-center">
          🎉 Your River Study Report
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 rounded-xl p-6">
            <h4 className="text-white font-semibold mb-4">Study Summary</h4>
            <div className="space-y-2 text-white/90">
              <p>Total Sites: <span className="font-medium">{reportData.totalSites}</span></p>
              <p>Cross-sectional Area: <span className="font-medium">{reportData.totalArea}m²</span></p>
              <p>Average Velocity: <span className="font-medium">{reportData.avgVelocity}m/s</span></p>
              <p>Total Discharge: <span className="font-medium">{reportData.discharge}m³/s</span></p>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-xl p-6">
            <h4 className="text-white font-semibold mb-4">Your Contribution</h4>
            <div className="space-y-2 text-white/90">
              <p>Site: <span className="font-medium">{userSite.siteName}</span></p>
              <p>Width: <span className="font-medium">{userSite.riverWidth}m</span></p>
              <p>Velocity: <span className="font-medium">{userSite.velocity}m/s</span></p>
              <p>Sediment: <span className="font-medium">{userSite.sedimentSize}</span></p>
            </div>
          </div>
        </div>
        
        <div className="text-center space-y-4">
          <p className="text-white/90 text-lg">
            This is just a preview! The full report includes professional charts, 
            maps, statistical analysis, and comprehensive data tables.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setCurrentStep('intro');
                setUserSite({
                  siteName: "Your Study Site",
                  riverWidth: 0,
                  measurementPoints: [],
                  velocity: undefined,
                  sedimentSize: undefined
                });
              }}
              className="px-6 py-3 border border-white/30 text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              Try Again
            </button>
            
            <button className="btn-primary px-6 py-3 rounded-xl font-semibold">
              Start Your Real River Study
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}