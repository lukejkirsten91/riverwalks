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
          <div key={i} className="glass rounded-xl p-6 text-center animate-pulse">
            <div className="w-8 h-8 bg-white/20 rounded-full mx-auto mb-3" />
            <div className="h-4 bg-white/20 rounded mb-2 w-3/4 mx-auto" />
            <div className="h-6 bg-white/20 rounded w-1/2 mx-auto" />
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
        <div className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform">
          <Droplets className="w-8 h-8 text-blue-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">River Studies</h3>
          <p className="text-2xl font-bold text-white">{metrics.riverWalks.toLocaleString()}</p>
        </div>
        
        <div className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform">
          <MapPin className="w-8 h-8 text-green-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">Study Sites</h3>
          <p className="text-2xl font-bold text-white">{metrics.measurementSites.toLocaleString()}</p>
        </div>
        
        <div className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform">
          <BarChart3 className="w-8 h-8 text-purple-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">Measurements</h3>
          <p className="text-2xl font-bold text-white">{metrics.totalMeasurements.toLocaleString()}</p>
        </div>
        
        <div className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform">
          <Square className="w-8 h-8 text-yellow-300 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">Area Studied</h3>
          <p className="text-2xl font-bold text-white">{metrics.areaStudiedSquareMeters.toLocaleString()}</p>
          <p className="text-xs text-white/70 mt-1">square meters</p>
        </div>
      </div>

      {/* UK Map placeholder - will implement interactive map */}
      {metrics.sitesWithCoordinates.length > 0 && (
        <div className="glass rounded-xl p-6 text-center">
          <h3 className="font-semibold text-white mb-3">Study Sites Across the UK</h3>
          <div className="bg-white/10 rounded-lg h-40 flex items-center justify-center">
            <div className="text-white/70">
              <MapPin className="w-8 h-8 mx-auto mb-2" />
              <p>{metrics.sitesWithCoordinates.length} mapped locations</p>
              <p className="text-sm">Interactive map coming soon!</p>
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