import { useState, useEffect } from 'react';
import { Mountain, Camera, Settings } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { InlineNumberEdit } from '../ui/InlineNumberEdit';
import { FileUpload } from '../ui/FileUpload';
import { LoadingButton } from '../ui/LoadingSpinner';
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

  // Photo handling
  const [sedimentationPhotoFile, setSedimentationPhotoFile] = useState<File | null>(null);
  const [sedimentationPhotoPreview, setSedimentationPhotoPreview] = useState<string | null>(
    site.sedimentation_photo_url || null
  );
  const [removeSedimentationPhoto, setRemoveSedimentationPhoto] = useState(false);

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

  const handleSedimentationPhotoSelect = (file: File) => {
    setSedimentationPhotoFile(file);
    setRemoveSedimentationPhoto(false);
    const previewUrl = URL.createObjectURL(file);
    setSedimentationPhotoPreview(previewUrl);
    setHasUnsavedChanges(true);
  };

  const handleSedimentationPhotoRemove = () => {
    setSedimentationPhotoFile(null);
    setSedimentationPhotoPreview(null);
    setRemoveSedimentationPhoto(true);
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent, markComplete: boolean = false) => {
    e.preventDefault();
    const todoStatus: TodoStatus = markComplete ? 'complete' : 'in_progress';
    
    const sedimentationData = {
      photo: sedimentationPhotoFile || undefined,
      measurements: sedimentationMeasurements,
    };

    await onSubmit(
      sedimentationData,
      numSedimentationMeasurements,
      sedimentationUnits,
      removeSedimentationPhoto,
      todoStatus
    );
    setHasUnsavedChanges(false);
  };

  return (
    <div className="card-modern-xl p-6 bg-card max-w-5xl mx-auto">
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
              currentImageUrl={sedimentationPhotoPreview}
              disabled={loading}
              loading={loading}
              loadingText="Uploading sediment photo..."
              uploadText="Upload sediment photo"
            />
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
                    <option value={0}>0 - Angular</option>
                    <option value={1}>1 - Very Angular</option>
                    <option value={2}>2 - Sub-angular</option>
                    <option value={3}>3 - Sub-rounded</option>
                    <option value={4}>4 - Rounded</option>
                    <option value={5}>5 - Well-rounded</option>
                    <option value={6}>6 - Very Well-rounded</option>
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
            className="btn-success touch-manipulation flex-1 sm:flex-none"
          >
            Save and Exit
          </LoadingButton>
          <LoadingButton
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSubmit(e as any, true)}
            loading={loading}
            loadingText="Completing..."
            className="btn-primary touch-manipulation flex-1 sm:flex-none"
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