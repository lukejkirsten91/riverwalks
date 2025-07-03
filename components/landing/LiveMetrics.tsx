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
        <div className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform bg-gray-900/80 backdrop-blur-md">
          <Droplets className="w-8 h-8 text-blue-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">River Studies</h3>
          <p className="text-2xl font-bold text-white">{metrics.riverWalks.toLocaleString()}</p>
        </div>
        
        <div className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform bg-gray-900/80 backdrop-blur-md">
          <MapPin className="w-8 h-8 text-green-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">Study Sites</h3>
          <p className="text-2xl font-bold text-white">{metrics.measurementSites.toLocaleString()}</p>
        </div>
        
        <div className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform bg-gray-900/80 backdrop-blur-md">
          <BarChart3 className="w-8 h-8 text-purple-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">Measurements</h3>
          <p className="text-2xl font-bold text-white">{metrics.totalMeasurements.toLocaleString()}</p>
        </div>
        
        <div className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform bg-gray-900/80 backdrop-blur-md">
          <Square className="w-8 h-8 text-yellow-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">Area Studied</h3>
          <p className="text-2xl font-bold text-white">{metrics.areaStudiedSquareMeters.toLocaleString()}</p>
          <p className="text-xs text-gray-300 mt-1">square meters</p>
        </div>
      </div>

      {/* UK Map with site dots */}
      {metrics.sitesWithCoordinates.length > 0 && (
        <div className="glass rounded-xl p-6 text-center bg-gray-900/80 backdrop-blur-md">
          <h3 className="font-semibold text-white mb-3">Study Sites Across the UK</h3>
          <div className="bg-gray-800/50 rounded-lg p-4 relative h-80">
            {/* Simple UK SVG outline */}
            <svg 
              viewBox="0 0 400 500" 
              className="w-full h-full"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            >
              {/* Simplified UK outline */}
              <path
                d="M120 450 L100 420 L90 380 L85 340 L80 300 L75 260 L70 220 L75 180 L80 140 L90 100 L100 80 L120 60 L150 50 L180 55 L200 65 L220 80 L240 100 L250 120 L260 140 L270 160 L275 180 L280 200 L285 220 L290 240 L295 260 L300 280 L305 300 L310 320 L315 340 L320 360 L325 380 L330 400 L325 420 L315 440 L300 450 L280 455 L260 450 L240 445 L220 440 L200 445 L180 450 L160 452 L140 451 Z"
                fill="#4B5563"
                stroke="#6B7280"
                strokeWidth="2"
              />
              
              {/* Plot site dots based on lat/lng coordinates */}
              {metrics.sitesWithCoordinates.map((site, index) => {
                // Simple coordinate conversion for UK (very approximate)
                // UK bounds: roughly 49.9-60.8 lat, -7.6-1.8 lng
                const x = ((site.longitude + 7.6) / 9.4) * 400;
                const y = ((60.8 - site.latitude) / 10.9) * 500;
                
                return (
                  <circle
                    key={index}
                    cx={Math.max(50, Math.min(350, x))}
                    cy={Math.max(50, Math.min(450, y))}
                    r="4"
                    fill="#3B82F6"
                    stroke="#FFFFFF"
                    strokeWidth="1"
                    className="animate-pulse"
                  >
                    <title>{site.site_name} ({site.latitude.toFixed(4)}, {site.longitude.toFixed(4)})</title>
                  </circle>
                );
              })}
            </svg>
            
            <div className="absolute bottom-2 left-2 text-xs text-gray-400">
              <p>{metrics.sitesWithCoordinates.length} study locations</p>
            </div>
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-gray-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Study Sites</span>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mt-6">
        <p className="text-white/60 text-sm">
          Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}