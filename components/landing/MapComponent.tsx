import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface SiteWithCoordinates {
  latitude: number;
  longitude: number;
  site_name: string;
}

interface MapComponentProps {
  sites: SiteWithCoordinates[];
}

// Fix default icon issue in React environment
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
    iconUrl: '/leaflet/images/marker-icon.png', 
    shadowUrl: '/leaflet/images/marker-shadow.png',
  });
}

// Create custom blue marker icon
const createCustomIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 12px;
      height: 12px;
      background-color: #3b82f6;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

const londonCenter: [number, number] = [51.5074, -0.1278]; // Centre of London
const zoomLevel = 9; // Higher zoom to show London area detail

export default function MapComponent({ sites }: MapComponentProps) {
  const customIcon = createCustomIcon();

  return (
    <MapContainer 
      center={londonCenter} 
      zoom={zoomLevel} 
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {sites.map((site, index) => (
        <Marker 
          key={`${site.latitude}-${site.longitude}-${index}`}
          position={[site.latitude, site.longitude]}
          icon={customIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>{site.site_name}</strong>
              <br />
              <span className="text-gray-600">
                {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}