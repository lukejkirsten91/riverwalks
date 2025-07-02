import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { MapPin, Camera, CloudSun, TreePine, Map } from 'lucide-react';
import { FileUpload } from '../ui/FileUpload';
import { LoadingButton } from '../ui/LoadingSpinner';
import { SaveConfirmationDialog } from '../ui/SaveConfirmationDialog';
import MapLocationPicker from '../ui/MapLocationPickerWrapper';
import { useOfflinePhoto } from '../../hooks/useOfflinePhoto';
import type { Site, SiteFormData, TodoStatus } from '../../types';

interface SiteInfoFormProps {
  site: Site;
  onSubmit: (
    formData: SiteFormData, 
    sitePhoto?: File, 
    removeSitePhoto?: boolean,
    todoStatus?: TodoStatus,
    offlinePhotoInfo?: { isOfflinePhoto: boolean; photoUrl: string | null }
  ) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export interface SiteInfoFormRef {
  triggerSaveConfirmation: () => void;
}

export const SiteInfoForm = forwardRef<SiteInfoFormRef, SiteInfoFormProps>(({
  site,
  onSubmit,
  onCancel,
  loading,
}, ref) => {
  const [formData, setFormData] = useState<SiteFormData>({
    site_name: `Site ${site.site_number}`, // Auto-generated, not editable
    latitude: site.latitude?.toString() || '',
    longitude: site.longitude?.toString() || '',
    notes: site.notes || '',
    weather_conditions: site.weather_conditions || '',
    land_use: site.land_use || '',
  });

  // Enhanced offline-aware photo handling
  const {
    photoState,
    selectPhoto,
    hasPhoto,
    isUploading: photoUploading,
    preview: sitePhotoPreview,
    isOfflinePhoto
  } = useOfflinePhoto('site_photo', site.id, site.photo_url);

  // Track photo removal state
  const [photoMarkedForRemoval, setPhotoMarkedForRemoval] = useState(false);

  // Map state
  const [showMap, setShowMap] = useState(false);

  // Track if form has been modified
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setHasUnsavedChanges(true);
  };

  // Handle coordinate input changes (for manual entry that should update map)
  const handleCoordinateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setHasUnsavedChanges(true);
  };

  // Handle map location changes
  const handleMapLocationChange = (lat: number, lng: number, address?: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }));
    setHasUnsavedChanges(true);
  };

  const handleSitePhotoSelect = async (file: File) => {
    await selectPhoto(file);
    setPhotoMarkedForRemoval(false); // Clear removal flag if new photo selected
    setHasUnsavedChanges(true);
  };

  const handleSitePhotoRemove = () => {
    setPhotoMarkedForRemoval(true);
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent, markComplete: boolean = false) => {
    e.preventDefault();
    const todoStatus: TodoStatus = markComplete ? 'complete' : 'in_progress';
    // Only pass the file if it's not already stored offline
    const photoFile = photoState.isOfflinePhoto ? undefined : (photoState.file || undefined);
    // Pass offline photo information
    const offlinePhotoInfo = photoState.isOfflinePhoto ? {
      isOfflinePhoto: true,
      photoUrl: photoState.photoUrl
    } : undefined;
    await onSubmit(formData, photoFile, photoMarkedForRemoval, todoStatus, offlinePhotoInfo);
    setHasUnsavedChanges(false);
  };

  const handleBackClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSaveComplete = async () => {
    const todoStatus: TodoStatus = 'complete';
    // Only pass the file if it's not already stored offline
    const photoFile = photoState.isOfflinePhoto ? undefined : (photoState.file || undefined);
    // Pass offline photo information
    const offlinePhotoInfo = photoState.isOfflinePhoto ? {
      isOfflinePhoto: true,
      photoUrl: photoState.photoUrl
    } : undefined;
    await onSubmit(formData, photoFile, photoMarkedForRemoval, todoStatus, offlinePhotoInfo);
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    onCancel();
  };

  const handleConfirmSaveInProgress = async () => {
    const todoStatus: TodoStatus = 'in_progress';
    // Only pass the file if it's not already stored offline
    const photoFile = photoState.isOfflinePhoto ? undefined : (photoState.file || undefined);
    // Pass offline photo information
    const offlinePhotoInfo = photoState.isOfflinePhoto ? {
      isOfflinePhoto: true,
      photoUrl: photoState.photoUrl
    } : undefined;
    await onSubmit(formData, photoFile, photoMarkedForRemoval, todoStatus, offlinePhotoInfo);
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    onCancel();
  };

  const handleConfirmLeaveWithoutSaving = () => {
    setShowConfirmDialog(false);
    onCancel();
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    triggerSaveConfirmation: () => {
      setShowConfirmDialog(true);
    }
  }));

  return (
    <div className="card-modern-xl p-6 bg-card w-full max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center gradient-primary text-white">
          <MapPin className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">Site Information</h3>
          <p className="text-muted-foreground">
            Record basic site details, location, and environmental conditions
          </p>
        </div>
      </div>

      {/* Instructions for Students */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Instructions for Site Information</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>1.</strong> Give your site a descriptive name (e.g., "Upstream Riffle", "Meander Pool")</p>
          <p><strong>2.</strong> Record GPS coordinates if available - use your phone's GPS or maps app</p>
          <p><strong>3.</strong> Take a photo showing the overall site and river channel</p>
          <p><strong>4.</strong> Note current weather conditions and recent rainfall</p>
          <p><strong>5.</strong> Observe and record surrounding land use (urban, agricultural, woodland, etc.)</p>
          <p><strong>6.</strong> Add any other relevant observations in the notes section</p>
        </div>
      </div>
      
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
        {/* Site Details Section */}
        <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
          {/* Site name header - not editable */}
          <div className="mb-6 p-4 bg-white/80 rounded-lg border border-blue-200">
            <h3 className="text-xl font-semibold text-foreground">Site {site.site_number}</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-foreground mb-3 font-medium">
                <span className="flex items-center gap-2">
                  <CloudSun className="w-4 h-4" />
                  Weather Conditions
                </span>
              </label>
              <input
                type="text"
                name="weather_conditions"
                value={formData.weather_conditions}
                onChange={handleInputChange}
                className="input-modern"
                placeholder="e.g., Sunny, light rain, overcast"
              />
            </div>

            <div>
              <label className="block text-foreground mb-3 font-medium">
                Latitude <span className="text-muted-foreground text-sm">(Optional)</span>
              </label>
              <input
                type="number"
                name="latitude"
                value={formData.latitude}
                onChange={handleCoordinateChange}
                className="input-modern"
                placeholder="e.g., 51.4545"
                step="any"
                min="-90"
                max="90"
              />
            </div>
            
            <div>
              <label className="block text-foreground mb-3 font-medium">
                Longitude <span className="text-muted-foreground text-sm">(Optional)</span>
              </label>
              <input
                type="number"
                name="longitude"
                value={formData.longitude}
                onChange={handleCoordinateChange}
                className="input-modern"
                placeholder="e.g., -2.5879"
                step="any"
                min="-180"
                max="180"
              />
            </div>

            {/* Map Location Picker */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-foreground font-medium">
                  <span className="flex items-center gap-2">
                    <Map className="w-4 h-4" />
                    Find Location on Map
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className={`btn-secondary text-sm ${showMap ? 'bg-primary/10 text-primary border-primary/30' : ''}`}
                >
                  {showMap ? 'Hide Map' : 'Show Map'}
                </button>
              </div>
              
              {showMap && (
                <div className="border-2 border-primary/20 rounded-lg p-4 bg-white/50">
                  <MapLocationPicker
                    latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
                    longitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
                    onLocationChange={handleMapLocationChange}
                    height="400px"
                  />
                </div>
              )}
              
              {!showMap && (
                <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4 text-center">
                  <Map className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-blue-700 font-medium mb-1">
                    Make it easy to find your location!
                  </p>
                  <p className="text-xs text-blue-600 mb-3">
                    Use the interactive map to find coordinates by clicking, searching for an address, or using GPS location
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className="btn-primary text-sm"
                  >
                    <Map className="w-4 h-4 mr-2" />
                    Open Map
                  </button>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-foreground mb-3 font-medium">
                <span className="flex items-center gap-2">
                  <TreePine className="w-4 h-4" />
                  Land Use
                </span>
              </label>
              <input
                type="text"
                name="land_use"
                value={formData.land_use}
                onChange={handleInputChange}
                className="input-modern"
                placeholder="e.g., Agricultural, Urban, Forest, Grassland"
              />
            </div>
          </div>

          {/* Site Photo */}
          <div className="mt-6">
            <label className="block text-foreground mb-3 font-medium">
              <span className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Site Photo <span className="text-muted-foreground text-sm">(Optional)</span>
              </span>
            </label>
            <FileUpload
              onFileSelect={handleSitePhotoSelect}
              onFileRemove={handleSitePhotoRemove}
              currentImageUrl={photoMarkedForRemoval ? null : sitePhotoPreview}
              disabled={loading || photoUploading}
              loading={photoUploading}
              loadingText="Saving site photo..."
              uploadText={isOfflinePhoto ? "📱 Site photo (offline)" : "Upload site photo"}
            />
            {photoMarkedForRemoval && sitePhotoPreview && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium mb-2">Photo marked for removal</p>
                <div className="relative inline-block">
                  <img
                    src={sitePhotoPreview}
                    alt="Photo to be removed"
                    className="h-20 w-20 object-cover rounded-lg border border-red-300 opacity-60"
                  />
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 text-xs font-bold">Will be deleted</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoMarkedForRemoval(false)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Keep photo
                </button>
              </div>
            )}
            {isOfflinePhoto && (
              <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                <span>📱</span>
                Photo saved offline - will upload when online
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label className="block text-foreground mb-3 font-medium">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="input-modern min-h-[80px] resize-y"
              placeholder="Add notes about this site..."
              rows={3}
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-2 border-gray-200">
          <LoadingButton
            type="submit"
            loading={loading}
            loadingText="Saving..."
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-yellow-600 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none"
          >
            Save and Mark as In Progress
          </LoadingButton>
          <LoadingButton
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSubmit(e as any, true)}
            loading={loading}
            loadingText="Completing..."
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-green-600 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none"
          >
            Save and Mark Complete
          </LoadingButton>
          <button
            type="button"
            onClick={handleBackClick}
            className="btn-secondary touch-manipulation flex-1 sm:flex-none"
            disabled={loading}
          >
            Back
          </button>
        </div>
      </form>
      
      <SaveConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onSaveAndMarkComplete={handleConfirmSaveComplete}
        onSaveAndMarkInProgress={handleConfirmSaveInProgress}
        onLeaveWithoutSaving={handleConfirmLeaveWithoutSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        loading={loading}
      />
    </div>
  );
});