import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { LatLng, Icon } from 'leaflet';
import { MapPin, Navigation, Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapLocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
  className?: string;
  height?: string;
}

interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
}

// Component to handle map clicks
function LocationMarker({ 
  position, 
  onPositionChange 
}: { 
  position: LatLng | null; 
  onPositionChange: (latlng: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker 
      position={position} 
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          onPositionChange(position);
        },
      }}
    >
      <Popup>
        <div className="text-center">
          <MapPin className="w-4 h-4 mx-auto mb-1 text-primary" />
          <div className="text-sm font-medium">Site Location</div>
          <div className="text-xs text-muted-foreground">
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Drag to adjust position
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Component to update map view when coordinates change externally
function MapUpdater({ center }: { center: LatLng }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

export function MapLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  className = "",
  height = "300px"
}: MapLocationPickerProps) {
  // Default to center of UK if no coordinates provided
  const defaultCenter: LatLng = new LatLng(54.7023545, -3.2765753);
  const [position, setPosition] = useState<LatLng | null>(
    latitude && longitude ? new LatLng(latitude, longitude) : null
  );
  const [center, setCenter] = useState<LatLng>(
    latitude && longitude ? new LatLng(latitude, longitude) : defaultCenter
  );
  
  // UI state
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{lat: number, lng: number, address?: string} | null>(null);

  // Update position when props change
  useEffect(() => {
    if (latitude && longitude) {
      const newPos = new LatLng(latitude, longitude);
      setPosition(newPos);
      setCenter(newPos);
    }
  }, [latitude, longitude]);

  // Handle position changes from map interactions
  const handlePositionChange = async (latlng: LatLng) => {
    // Get address first
    let address = '';
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      address = data.display_name || '';
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }
    
    // Show confirmation dialog for new locations
    if (!position) {
      setPendingLocation({ lat: latlng.lat, lng: latlng.lng, address });
      setShowConfirmDialog(true);
    } else {
      // Direct update for existing markers being dragged
      confirmLocationUpdate(latlng.lat, latlng.lng, address);
    }
  };

  // Confirm and save location
  const confirmLocationUpdate = (lat: number, lng: number, address?: string) => {
    const newPos = new LatLng(lat, lng);
    setPosition(newPos);
    setCenter(newPos);
    onLocationChange(lat, lng, address);
    setLocationStatus('success');
    setStatusMessage('Coordinates saved successfully!');
    setTimeout(() => setLocationStatus('idle'), 3000);
    setShowConfirmDialog(false);
    setPendingLocation(null);
  };

  // Cancel location selection
  const cancelLocationSelection = () => {
    setShowConfirmDialog(false);
    setPendingLocation(null);
  };

  // Get user's current location
  const handleFindLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setStatusMessage('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationStatus('idle');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = new LatLng(latitude, longitude);
        setIsLocating(false);
        
        // Get address for GPS location
        let address = '';
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          address = data.display_name || '';
        } catch (error) {
          console.warn('Reverse geocoding failed:', error);
        }
        
        // Show confirmation for GPS location
        setPendingLocation({ lat: latitude, lng: longitude, address });
        setShowConfirmDialog(true);
      },
      (error) => {
        setIsLocating(false);
        setLocationStatus('error');
        let message = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please enable location services.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        
        setStatusMessage(message);
        setTimeout(() => setLocationStatus('idle'), 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Search for address/postcode
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setShowResults(false);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=gb`
      );
      const results = await response.json();
      setSearchResults(results);
      setShowResults(true);
      setIsSearching(false);
    } catch (error) {
      console.error('Search failed:', error);
      setIsSearching(false);
      setLocationStatus('error');
      setStatusMessage('Search failed. Please try again.');
    }
  };

  // Handle search result selection
  const handleResultSelect = (result: GeocodingResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    setPendingLocation({ lat, lng, address: result.display_name });
    setShowConfirmDialog(true);
    setShowResults(false);
    setSearchQuery('');
  };

  // Handle search input key press
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="space-y-3">
        {/* Find Location Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleFindLocation}
            disabled={isLocating}
            className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none touch-manipulation"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {isLocating ? 'Finding Location...' : 'Find My Location'}
          </button>
          
          {/* Status Indicator */}
          {locationStatus !== 'idle' && (
            <div className="flex items-center gap-2 text-sm">
              {locationStatus === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className={locationStatus === 'success' ? 'text-green-700' : 'text-red-700'}>
                {statusMessage}
              </span>
            </div>
          )}
        </div>

        {/* Address Search */}
        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search for address or postcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="input-modern flex-1"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="btn-secondary flex items-center gap-2 touch-manipulation"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </button>
          </div>
          
          {/* Search Results */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleResultSelect(result)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm"
                >
                  <div className="font-medium truncate">{result.display_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div style={{ height }}>
          <MapContainer
            center={center}
            zoom={position ? 15 : 6}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} onPositionChange={handlePositionChange} />
            <MapUpdater center={center} />
          </MapContainer>
        </div>
        
        {/* Map Instructions Overlay */}
        {!position && (
          <div className="absolute top-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm z-10">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>Click on the map to place a pin, search for an address, or use "Find My Location" to auto-locate</span>
            </div>
          </div>
        )}
      </div>

      {/* Current Coordinates Display */}
      {position && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">Selected Location:</span>
            <span className="text-blue-700">
              {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </span>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Click or drag the pin to adjust the exact position
          </div>
        </div>
      )}

      {/* Location Confirmation Dialog */}
      {showConfirmDialog && pendingLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-auto shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Site Location</h3>
                <p className="text-sm text-gray-600">Is this the correct location for your site?</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-sm font-medium text-gray-900 mb-1">Coordinates:</div>
              <div className="text-sm text-gray-700 font-mono">
                {pendingLocation.lat.toFixed(6)}, {pendingLocation.lng.toFixed(6)}
              </div>
              {pendingLocation.address && (
                <div className="text-xs text-gray-600 mt-2">
                  <span className="font-medium">Address:</span> {pendingLocation.address}
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => confirmLocationUpdate(pendingLocation.lat, pendingLocation.lng, pendingLocation.address)}
                className="btn-success flex-1 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Save Location
              </button>
              <button
                onClick={cancelLocationSelection}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}