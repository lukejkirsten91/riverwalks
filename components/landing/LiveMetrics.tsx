import { useState, useEffect } from 'react';
import { MapPin, BarChart3, Droplets, Square } from 'lucide-react';

interface PublicMetrics {
  riverWalks: number;
  measurementSites: number; 
  totalMeasurements: number;
  areaStudiedSquareMeters: number;
  sitesWithCoordinates: Array<{
    latitude: number;
    longitude: number;
    site_name: string;
  }>;
  lastUpdated: string;
}

export function LiveMetrics() {
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/public-metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-6 text-center animate-pulse bg-gray-900/80 backdrop-blur-md">
            <div className="w-8 h-8 bg-gray-600 rounded-full mx-auto mb-3" />
            <div className="h-4 bg-gray-600 rounded mb-2 w-3/4 mx-auto" />
            <div className="h-6 bg-gray-600 rounded w-1/2 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="text-center text-white/70 max-w-4xl mx-auto">
        <p>Unable to load live metrics</p>
        <button 
          onClick={fetchMetrics}
          className="text-white/90 hover:text-white underline text-sm mt-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Real Rivers, Real Data 🌊
        </h2>
        <p className="text-white/80 text-lg">
          Join the community exploring UK waterways
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div 
          className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform bg-gray-900/80 backdrop-blur-md cursor-help"
          title="Individual field studies completed by users - each adds valuable data to our river research database"
        >
          <Droplets className="w-8 h-8 text-blue-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">River Walks Completed</h3>
          <p className="text-2xl font-bold text-white">{metrics.riverWalks.toLocaleString()}</p>
          <p className="text-xs text-gray-300 mt-1">Each walk contributes data</p>
        </div>
        
        <div 
          className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform bg-gray-900/80 backdrop-blur-md cursor-help"
          title="Distinct geographical locations where measurements have been taken - building a comprehensive map of UK waterways"
        >
          <MapPin className="w-8 h-8 text-green-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">Monitoring Locations</h3>
          <p className="text-2xl font-bold text-white">{metrics.measurementSites.toLocaleString()}</p>
          <p className="text-xs text-gray-300 mt-1">Unique sites measured</p>
        </div>
        
        <div 
          className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform bg-gray-900/80 backdrop-blur-md cursor-help"
          title="Total scientific measurements recorded including depth readings, velocity data, sediment analysis, and water quality metrics"
        >
          <BarChart3 className="w-8 h-8 text-purple-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">Data Points Collected</h3>
          <p className="text-2xl font-bold text-white">{metrics.totalMeasurements.toLocaleString()}</p>
          <p className="text-xs text-gray-300 mt-1">Measurements recorded</p>
        </div>
        
        <div 
          className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform bg-gray-900/80 backdrop-blur-md cursor-help"
          title="Total length of river sections studied across the UK - each site contributes to our understanding of waterway patterns"
        >
          <Square className="w-8 h-8 text-yellow-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">River Sections</h3>
          <p className="text-2xl font-bold text-white">{Math.round(metrics.areaStudiedSquareMeters || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-300 mt-1">meters of river studied</p>
        </div>
      </div>

      {/* UK Map with site dots */}
      {metrics.sitesWithCoordinates.length > 0 && (
        <div className="glass rounded-xl p-6 text-center bg-gray-900/80 backdrop-blur-md">
          <h3 className="font-semibold text-white mb-3">Study Sites Across the UK</h3>
          <div className="bg-gray-800/50 rounded-lg p-4 relative h-80">
            {/* Simple UK SVG outline */}
            {/* Simple UK outline using a background image and overlay approach */}
            <div className="relative w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg overflow-hidden">
              {/* UK Outline using CSS shape */}
              <div className="absolute inset-4">
                <svg viewBox="0 0 100 120" className="w-full h-full">
                  {/* Simplified recognizable UK outline */}
                  <path
                    d="M20 10 L30 8 L45 5 L60 7 L70 12 L75 20 L78 30 L80 40 L82 50 L85 60 L87 70 L89 80 L90 90 L88 100 L85 108 L80 112 L70 115 L55 118 L40 115 L25 110 L15 100 L10 85 L8 70 L5 55 L3 40 L5 25 L10 15 L20 10 Z M12 35 L18 33 L22 36 L20 42 L15 44 L12 40 L12 35 Z"
                    fill="#475569"
                    stroke="#64748b"
                    strokeWidth="1"
                    className="drop-shadow-sm"
                  />
                  
                  {/* Plot site dots */}
                  {metrics.sitesWithCoordinates.map((site, index) => {
                    // Simple coordinate conversion for UK bounds
                    const x = ((site.longitude + 8) / 10) * 100;
                    const y = ((61 - site.latitude) / 12) * 120;
                    
                    return (
                      <circle
                        key={index}
                        cx={Math.max(10, Math.min(90, x))}
                        cy={Math.max(10, Math.min(110, y))}
                        r="2"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="0.5"
                        className="animate-pulse"
                      >
                        <title>{site.site_name}</title>
                      </circle>
                    );
                  })}
                </svg>
              </div>
              
              {/* Overlay text */}
              <div className="absolute bottom-2 left-2 text-xs text-gray-400">
                <p>{metrics.sitesWithCoordinates.length} locations</p>
              </div>
              <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-gray-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Active Sites</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="text-center mt-8 mb-6">
        <div className="glass rounded-xl p-6 bg-blue-500/20 border border-blue-400/30 max-w-2xl mx-auto">
          <h3 className="font-semibold text-blue-100 mb-2">🌊 Join the UK River Research Community!</h3>
          <p className="text-blue-200 text-sm mb-4">
            Be part of {metrics.measurementSites.toLocaleString()} active monitoring locations. Every river walk adds valuable data to UK waterway science!
          </p>
          <div className="flex justify-center gap-6 text-center">
            <div>
              <p className="text-blue-100 font-bold text-lg">{metrics.riverWalks.toLocaleString()}</p>
              <p className="text-blue-300 text-xs">Studies Completed</p>
            </div>
            <div>
              <p className="text-blue-100 font-bold text-lg">{metrics.totalMeasurements.toLocaleString()}</p>
              <p className="text-blue-300 text-xs">Data Points</p>
            </div>
            <div>
              <p className="text-blue-100 font-bold text-lg">{metrics.sitesWithCoordinates.length}</p>
              <p className="text-blue-300 text-xs">Mapped Locations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-4">
        <p className="text-white/60 text-sm">
          Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}