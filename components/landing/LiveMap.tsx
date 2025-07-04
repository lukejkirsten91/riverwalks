import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

interface SiteWithCoordinates {
  latitude: number;
  longitude: number;
  site_name: string;
}

interface LiveMapProps {
  sites: SiteWithCoordinates[];
}

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(
  () => import('./MapComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-800/50 rounded-lg">
        <div className="text-white/70 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/70 mx-auto mb-2"></div>
          <p>Loading map...</p>
        </div>
      </div>
    )
  }
);

export function LiveMap({ sites }: LiveMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800/50 rounded-lg">
        <div className="text-white/70 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/70 mx-auto mb-2"></div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return <MapComponent sites={sites} />;
}