import { useState, useEffect } from 'react';
import { Mountain, Camera, Settings } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { InlineNumberEdit } from '../ui/InlineNumberEdit';
import { FileUpload } from '../ui/FileUpload';
import { LoadingButton } from '../ui/LoadingSpinner';
import { useOfflinePhoto } from '../../hooks/useOfflinePhoto';
import type { Site, SedimentationMeasurement, UnitType, TodoStatus } from '../../types';

interface SedimentFormProps {
  site: Site;
  onSubmit: (
    sedimentationData: {
      photo?: File;
      measurements: SedimentationMeasurement[];
    },
    numSedimentationMeasurements: number,
    sedimentationUnits: UnitType,
    removeSedimentationPhoto?: boolean,
    todoStatus?: TodoStatus
  ) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const UNIT_OPTIONS: { value: UnitType; label: string; shortLabel: string }[] = [
  { value: 'm', label: 'Meters', shortLabel: 'm' },
  { value: 'cm', label: 'Centimeters', shortLabel: 'cm' },
  { value: 'mm', label: 'Millimeters', shortLabel: 'mm' },
  { value: 'ft', label: 'Feet', shortLabel: 'ft' },
  { value: 'in', label: 'Inches', shortLabel: 'in' },
  { value: 'yd', label: 'Yards', shortLabel: 'yd' },
];

export function SedimentForm({
  site,
  onSubmit,
  onCancel,
  loading,
}: SedimentFormProps) {
  // Form state
  const [sedimentationUnits, setSedimentationUnits] = useState<UnitType>(site.sedimentation_units || 'mm');
  const [numSedimentationMeasurements, setNumSedimentationMeasurements] = useState(
    site.sedimentation_data?.measurements?.length || 3
  );
  const [sedimentationMeasurements, setSedimentationMeasurements] = useState<SedimentationMeasurement[]>([]);

  // Enhanced offline-aware photo handling
  const {
    photoState,
    selectPhoto,
    hasPhoto,
    isUploading: photoUploading,
    preview: sedimentationPhotoPreview,
    isOfflinePhoto
  } = useOfflinePhoto('sediment_photo', site.id, site.sedimentation_photo_url);

  // Track photo removal state
  const [photoMarkedForRemoval, setPhotoMarkedForRemoval] = useState(false);

  // Track if form has been modified
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize sedimentation data - always auto-update when count changes
  useEffect(() => {
    if (site.sedimentation_data?.measurements) {
      const existing = site.sedimentation_data.measurements;
      
      // If the number of measurements changed, adjust the array to match
      if (existing.length !== numSedimentationMeasurements) {
        const newMeasurements = Array.from({ length: numSedimentationMeasurements }, (_, index) => ({
          sediment_size: index < existing.length ? existing[index].sediment_size : 0,
          sediment_roundness: index < existing.length ? existing[index].sediment_roundness : 0,
        }));
        setSedimentationMeasurements(newMeasurements);
      } else {
        // Same number of measurements - use existing data
        setSedimentationMeasurements(existing);
      }
    } else {
      // Initialize with empty measurements for new sites
      const newMeasurements = Array.from({ length: numSedimentationMeasurements }, () => ({
        sediment_size: 0,
        sediment_roundness: 0,
      }));
      setSedimentationMeasurements(newMeasurements);
    }
  }, [numSedimentationMeasurements, site]);

  const handleSedimentationMeasurementChange = (index: number, field: keyof SedimentationMeasurement, value: string | number) => {
    const newData = [...sedimentationMeasurements];
    newData[index] = {
      ...newData[index],
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value,
    };
    setSedimentationMeasurements(newData);
    setHasUnsavedChanges(true);
  };

  const handleNumMeasurementsChange = (num: number) => {
    setNumSedimentationMeasurements(num);
    setHasUnsavedChanges(true);

    // Adjust measurements array
    const newMeasurements = Array.from({ length: num }, (_, index) => ({
      sediment_size: index < sedimentationMeasurements.length ? sedimentationMeasurements[index].sediment_size : 0,
      sediment_roundness: index < sedimentationMeasurements.length ? sedimentationMeasurements[index].sediment_roundness : 0,
    }));
    setSedimentationMeasurements(newMeasurements);
  };

  const handleSedimentationUnitsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSedimentationUnits(e.target.value as UnitType);
    setHasUnsavedChanges(true);
  };

  const handleSedimentationPhotoSelect = async (file: File) => {
    await selectPhoto(file);
    setPhotoMarkedForRemoval(false); // Clear removal flag if new photo selected
    setHasUnsavedChanges(true);
  };

  const handleSedimentationPhotoRemove = () => {
    setPhotoMarkedForRemoval(true);
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent, markComplete: boolean = false) => {
    e.preventDefault();
    const todoStatus: TodoStatus = markComplete ? 'complete' : 'in_progress';
    
    const sedimentationData = {
      photo: photoState.file || undefined,
      photoUrl: photoState.photoUrl || undefined,
      isOfflinePhoto,
      measurements: sedimentationMeasurements,
    };

    await onSubmit(
      sedimentationData,
      numSedimentationMeasurements,
      sedimentationUnits,
      photoMarkedForRemoval, // removeSedimentationPhoto
      todoStatus
    );
    setHasUnsavedChanges(false);
  };

  return (
    <div className="card-modern-xl p-6 bg-card w-full max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600">
          <Mountain className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">Sediment Analysis</h3>
          <p className="text-muted-foreground">
            Analyze sediment size and roundness from samples collected at this site
          </p>
        </div>
      </div>

      {/* Instructions for Students */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Instructions for Sediment Analysis</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>1.</strong> Collect 3+ sediment samples from different areas of the riverbed at this site</p>
          <p><strong>2.</strong> Take a photo of your samples laid out for reference</p>
          <p><strong>3.</strong> Measure each sample's size in mm using a ruler or caliper</p>
          <p><strong>4.</strong> Compare each sample to the Powers Roundness Scale below (1=very angular, 6=very rounded)</p>
          <p><strong>5.</strong> Record your measurements in the table</p>
        </div>
      </div>

      {/* Powers Roundness Scale Reference */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-900 mb-3 text-center">Powers Roundness Scale Reference</h4>
        <div className="flex justify-center">
          <img 
            src="/powers_roundness_scale.png" 
            alt="Powers Roundness Scale showing sediment shape categories from 1 (very angular) to 6 (very rounded)"
            className="max-w-full h-auto rounded border border-gray-300 shadow-sm"
            style={{ maxHeight: '200px' }}
            onError={(e) => {
              console.error('Powers roundness scale image failed to load');
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden bg-gray-100 border border-gray-300 rounded p-8 text-center" style={{ maxHeight: '200px', minWidth: '300px' }}>
            <p className="text-gray-600 font-medium mb-2">Powers Roundness Scale</p>
            <p className="text-sm text-gray-500 mb-4">Image unavailable offline</p>
            <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
              <div>1 = Very Angular</div>
              <div>4 = Sub-rounded</div>
              <div>2 = Angular</div>
              <div>5 = Rounded</div>
              <div>3 = Sub-angular</div>
              <div>6 = Well-rounded</div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600 text-center mt-2">
          Use this scale to rate sediment roundness: 1 = Very Angular, 6 = Well-rounded
        </p>
      </div>
      
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
        <div className="bg-amber-50/50 rounded-xl p-6 border border-amber-100">
          {/* Units and Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-foreground mb-3 font-medium">
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Sedimentation Units
                </span>
              </label>
              <select
                value={sedimentationUnits}
                onChange={handleSedimentationUnitsChange}
                className="input-modern"
                required
              >
                {UNIT_OPTIONS.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label} ({unit.shortLabel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-foreground mb-3 font-medium">
                Number of Sedimentation Measurements
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm">Count:</span>
                <InlineNumberEdit
                  value={numSedimentationMeasurements}
                  onSave={handleNumMeasurementsChange}
                  min={1}
                  max={10}
                  decimals={0}
                  className="text-base font-medium border border-border min-w-[80px] flex-1"
                />
              </div>
            </div>
          </div>

          {/* Sedimentation Photo */}
          <div className="mb-6">
            <label className="block text-foreground mb-3 font-medium">
              <span className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Sedimentation Photo <span className="text-muted-foreground text-sm">(Optional)</span>
              </span>
            </label>
            <FileUpload
              onFileSelect={handleSedimentationPhotoSelect}
              onFileRemove={handleSedimentationPhotoRemove}
              currentImageUrl={photoMarkedForRemoval ? null : sedimentationPhotoPreview}
              disabled={loading || photoUploading}
              loading={photoUploading}
              loadingText="Saving sediment photo..."
              uploadText={isOfflinePhoto ? "📱 Sediment photo (offline)" : "Upload sediment photo"}
            />
            {photoMarkedForRemoval && sedimentationPhotoPreview && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium mb-2">Photo marked for removal</p>
                <div className="relative inline-block">
                  <img
                    src={sedimentationPhotoPreview}
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

          {/* Sedimentation measurements */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-700">Sediment Measurements</h5>
            {sedimentationMeasurements.map((measurement, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-amber-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Measurement {index + 1} - Sediment Size ({sedimentationUnits})
                  </label>
                  <NumberInput
                    value={measurement.sediment_size.toString()}
                    onChange={(value) =>
                      handleSedimentationMeasurementChange(index, 'sediment_size', value)
                    }
                    placeholder="0.0"
                    step={sedimentationUnits === 'mm' ? 0.1 : 0.01}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sediment Roundness (0-6 scale)
                  </label>
                  <select
                    value={measurement.sediment_roundness}
                    onChange={(e) =>
                      handleSedimentationMeasurementChange(index, 'sediment_roundness', parseFloat(e.target.value))
                    }
                    className="input-modern"
                  >
                    <option value={1}>1 - Very Angular</option>
                    <option value={2}>2 - Angular</option>
                    <option value={3}>3 - Sub-angular</option>
                    <option value={4}>4 - Sub-rounded</option>
                    <option value={5}>5 - Rounded</option>
                    <option value={6}>6 - Well-rounded</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Statistics */}
          {sedimentationMeasurements.length > 0 && (
            <div className="mt-6 p-4 bg-amber-100 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Mountain className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Sample Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-amber-700 font-medium">Average Size:</span>
                  <span className="ml-2 text-amber-800">
                    {(sedimentationMeasurements.reduce((sum, m) => sum + m.sediment_size, 0) / sedimentationMeasurements.length).toFixed(2)} {sedimentationUnits}
                  </span>
                </div>
                <div>
                  <span className="text-amber-700 font-medium">Average Roundness:</span>
                  <span className="ml-2 text-amber-800">
                    {(sedimentationMeasurements.reduce((sum, m) => sum + m.sediment_roundness, 0) / sedimentationMeasurements.length).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )}
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
            onClick={onCancel}
            className="btn-secondary touch-manipulation flex-1 sm:flex-none"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}