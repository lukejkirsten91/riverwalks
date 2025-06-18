import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import MapLocationPicker to avoid SSR issues with Leaflet
const MapLocationPicker = dynamic(
  () => import('./MapLocationPicker').then((mod) => ({ default: mod.MapLocationPicker })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    ),
  }
);

export default MapLocationPicker;