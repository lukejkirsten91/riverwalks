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
          title="Total area of UK waterways studied and documented by our community - approximately equivalent to football field size for easy comparison"
        >
          <Square className="w-8 h-8 text-yellow-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">River Coverage</h3>
          <p className="text-2xl font-bold text-white">{Math.round(metrics.areaStudiedSquareMeters / 7140).toLocaleString()}</p>
          <p className="text-xs text-gray-300 mt-1">≈ football fields studied</p>
        </div>
      </div>

      {/* UK Map with site dots */}
      {metrics.sitesWithCoordinates.length > 0 && (
        <div className="glass rounded-xl p-6 text-center bg-gray-900/80 backdrop-blur-md">
          <h3 className="font-semibold text-white mb-3">Study Sites Across the UK</h3>
          <div className="bg-gray-800/50 rounded-lg p-4 relative h-80">
            {/* Simple UK SVG outline */}
            <svg 
              viewBox="0 0 300 400" 
              className="w-full h-full"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            >
              {/* Simplified but recognizable UK outline */}
              <path
                d="M 140 20 L 150 15 L 160 10 L 175 8 L 190 7 L 205 6 L 220 5 L 235 4 L 250 3 L 260 5 L 270 8 L 275 15 L 278 25 L 280 35 L 282 45 L 285 55 L 288 65 L 290 75 L 292 85 L 294 95 L 296 105 L 298 115 L 300 125 L 299 135 L 298 145 L 297 155 L 296 165 L 295 175 L 294 185 L 293 195 L 292 205 L 291 215 L 290 225 L 289 235 L 288 245 L 287 255 L 286 265 L 285 275 L 284 285 L 283 295 L 282 305 L 281 315 L 280 325 L 279 335 L 278 345 L 277 355 L 276 365 L 275 375 L 270 380 L 260 385 L 245 390 L 230 395 L 215 398 L 200 400 L 185 398 L 170 395 L 155 390 L 140 385 L 125 380 L 110 375 L 95 370 L 80 365 L 65 360 L 50 355 L 35 350 L 25 340 L 20 325 L 18 310 L 16 295 L 14 280 L 12 265 L 10 250 L 8 235 L 6 220 L 4 205 L 2 190 L 0 175 L 2 160 L 4 145 L 6 130 L 8 115 L 10 100 L 12 85 L 14 70 L 16 55 L 18 40 L 25 30 L 35 25 L 50 22 L 65 20 L 80 18 L 95 16 L 110 14 L 125 12 L 140 20 Z
                   
                   M 30 140 L 40 135 L 50 138 L 55 145 L 58 155 L 55 165 L 50 175 L 40 180 L 30 175 L 25 165 L 28 155 L 30 140 Z"
                fill="#4B5563"
                stroke="#6B7280"
                strokeWidth="2"
              />
              
              {/* Plot site dots based on lat/lng coordinates */}
              {metrics.sitesWithCoordinates.map((site, index) => {
                // Simple coordinate conversion for UK (very approximate)
                // UK bounds: roughly 49.9-60.8 lat, -7.6-1.8 lng
                // Map to the viewBox dimensions 300x400
                const x = ((site.longitude + 7.6) / 9.4) * 300;
                const y = ((60.8 - site.latitude) / 10.9) * 400;
                
                return (
                  <circle
                    key={index}
                    cx={Math.max(30, Math.min(270, x))}
                    cy={Math.max(30, Math.min(370, y))}
                    r="6"
                    fill="#3B82F6"
                    stroke="#FFFFFF"
                    strokeWidth="2"
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

      {/* Call to Action */}
      <div className="text-center mt-8 mb-6">
        <div className="glass rounded-xl p-6 bg-blue-500/20 border border-blue-400/30 max-w-2xl mx-auto">
          <h3 className="font-semibold text-blue-100 mb-2">🎯 Help Us Reach 1,000 Sites!</h3>
          <p className="text-blue-200 text-sm mb-4">
            Join {metrics.measurementSites.toLocaleString()} locations already mapped. Your river walk could be the next breakthrough in UK waterway research!
          </p>
          <div className="w-full bg-blue-900/50 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-400 h-2 rounded-full transition-all duration-1000" 
              style={{ width: `${Math.min((metrics.measurementSites / 1000) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-blue-300 text-xs">
            {metrics.measurementSites}/1000 sites mapped ({Math.round((metrics.measurementSites / 1000) * 100)}% complete)
          </p>
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