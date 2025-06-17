import { useState, useEffect } from 'react';
import { MapPin, Camera, Droplets, Mountain, CloudSun, TreePine, Settings } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { InlineNumberEdit } from '../ui/InlineNumberEdit';
import { FileUpload } from '../ui/FileUpload';
import type { Site, SiteFormData, MeasurementPointFormData, SedimentationMeasurement, UnitType } from '../../types';

interface EnhancedSiteFormProps {
  editingSite?: Site | null;
  onSubmit: (
    formData: SiteFormData, 
    measurementData: MeasurementPointFormData[],
    numMeasurements: number,
    riverWidth: number,
    sedimentationData: {
      photo?: File;
      measurements: SedimentationMeasurement[];
    },
    sitePhoto?: File, 
    removeSitePhoto?: boolean,
    removeSedimentationPhoto?: boolean
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

export function EnhancedSiteForm({
  editingSite,
  onSubmit,
  onCancel,
  loading,
}: EnhancedSiteFormProps) {
  // Site details form data
  const [formData, setFormData] = useState<SiteFormData>({
    site_name: editingSite?.site_name || `Site ${(editingSite?.site_number ?? 1)}`,
    latitude: editingSite?.latitude ? editingSite.latitude.toString() : '',
    longitude: editingSite?.longitude ? editingSite.longitude.toString() : '',
    notes: editingSite?.notes || '',
    weather_conditions: editingSite?.weather_conditions || '',
    land_use: editingSite?.land_use || '',
    depth_units: editingSite?.depth_units || 'm',
    sedimentation_units: editingSite?.sedimentation_units || 'mm',
  });

  // Site photo handling
  const [sitePhotoFile, setSitePhotoFile] = useState<File | null>(null);
  const [sitePhotoPreview, setSitePhotoPreview] = useState<string | null>(editingSite?.photo_url || null);
  const [removeSitePhoto, setRemoveSitePhoto] = useState(false);

  // Measurement data
  const [numMeasurements, setNumMeasurements] = useState(
    editingSite?.measurement_points?.length || 5
  );
  const [riverWidth, setRiverWidth] = useState(editingSite?.river_width || 10);
  const [measurementData, setMeasurementData] = useState<MeasurementPointFormData[]>([]);

  // Sedimentation data
  const [numSedimentationMeasurements, setNumSedimentationMeasurements] = useState(3);
  const [sedimentationMeasurements, setSedimentationMeasurements] = useState<SedimentationMeasurement[]>([]);
  const [sedimentationPhotoFile, setSedimentationPhotoFile] = useState<File | null>(null);
  const [sedimentationPhotoPreview, setSedimentationPhotoPreview] = useState<string | null>(
    editingSite?.sedimentation_photo_url || null
  );
  const [removeSedimentationPhoto, setRemoveSedimentationPhoto] = useState(false);

  // Initialize measurement data
  useEffect(() => {
    if (editingSite?.measurement_points && editingSite.measurement_points.length > 0) {
      // Use existing measurement points
      const existing = editingSite.measurement_points
        .sort((a, b) => a.point_number - b.point_number)
        .map(point => ({
          distance_from_bank: point.distance_from_bank,
          depth: point.depth,
        }));
      setMeasurementData(existing);
    } else {
      // Generate evenly spaced measurement points
      const newMeasurements = Array.from({ length: numMeasurements }, (_, index) => ({
        distance_from_bank: (index * riverWidth) / (numMeasurements - 1),
        depth: 0,
      }));
      setMeasurementData(newMeasurements);
    }
  }, [numMeasurements, riverWidth, editingSite]);

  // Initialize sedimentation data
  useEffect(() => {
    if (editingSite?.sedimentation_data?.measurements) {
      setSedimentationMeasurements(editingSite.sedimentation_data.measurements);
      setNumSedimentationMeasurements(editingSite.sedimentation_data.measurements.length);
    } else {
      // Initialize with empty measurements
      const newMeasurements = Array.from({ length: numSedimentationMeasurements }, () => ({
        sediment_size: 0,
        sediment_roundness: 0,
      }));
      setSedimentationMeasurements(newMeasurements);
    }
  }, [numSedimentationMeasurements, editingSite]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMeasurementChange = (index: number, field: keyof MeasurementPointFormData, value: string) => {
    const newData = [...measurementData];
    newData[index] = {
      ...newData[index],
      [field]: parseFloat(value) || 0,
    };
    setMeasurementData(newData);
  };

  const handleSedimentationMeasurementChange = (index: number, field: keyof SedimentationMeasurement, value: string | number) => {
    const newData = [...sedimentationMeasurements];
    newData[index] = {
      ...newData[index],
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value,
    };
    setSedimentationMeasurements(newData);
  };

  const handleNumMeasurementsChange = (num: number) => {
    setNumMeasurements(num);
  };

  const handleRiverWidthChange = (width: number) => {
    setRiverWidth(width);
    
    // Auto-update measurement distances
    const newMeasurements = measurementData.map((measurement, index) => ({
      ...measurement,
      distance_from_bank: (index * width) / (measurementData.length - 1),
    }));
    setMeasurementData(newMeasurements);
  };

  const handleSitePhotoSelect = (file: File) => {
    setSitePhotoFile(file);
    setRemoveSitePhoto(false);
    const previewUrl = URL.createObjectURL(file);
    setSitePhotoPreview(previewUrl);
  };

  const handleSitePhotoRemove = () => {
    setSitePhotoFile(null);
    setSitePhotoPreview(null);
    setRemoveSitePhoto(true);
  };

  const handleSedimentationPhotoSelect = (file: File) => {
    setSedimentationPhotoFile(file);
    setRemoveSedimentationPhoto(false);
    const previewUrl = URL.createObjectURL(file);
    setSedimentationPhotoPreview(previewUrl);
  };

  const handleSedimentationPhotoRemove = () => {
    setSedimentationPhotoFile(null);
    setSedimentationPhotoPreview(null);
    setRemoveSedimentationPhoto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(
      formData,
      measurementData,
      numMeasurements,
      riverWidth,
      {
        photo: sedimentationPhotoFile || undefined,
        measurements: sedimentationMeasurements,
      },
      sitePhotoFile || undefined,
      removeSitePhoto,
      removeSedimentationPhoto
    );
  };

  const title = editingSite ? 'Edit Site & Measurements' : 'Add New Site';
  const buttonText = editingSite ? 'Update Site' : 'Create Site';
  const loadingText = editingSite ? 'Updating...' : 'Creating...';

  return (
    <div className="card-modern-xl p-6 bg-card max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center gradient-primary text-white">
          <MapPin className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">{title}</h3>
          <p className="text-muted-foreground">
            Complete site details, measurements, and sedimentation data
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-10">
        {/* =============== SITE DETAILS SECTION =============== */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b-2 border-primary/20 pb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <h4 className="text-xl font-bold text-foreground">Site Details</h4>
          </div>

          <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-foreground mb-3 font-medium">Site Name</label>
                <input
                  type="text"
                  name="site_name"
                  value={formData.site_name}
                  onChange={handleInputChange}
                  className="input-modern"
                  placeholder="e.g., Site 1, Upstream, Meander"
                  required
                />
              </div>

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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  className="input-modern"
                  placeholder="e.g., -2.5879"
                  step="any"
                  min="-180"
                  max="180"
                />
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
                currentImageUrl={sitePhotoPreview}
                disabled={loading}
              />
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
        </div>

        {/* =============== DEPTH MEASUREMENTS SECTION =============== */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b-2 border-blue-500/20 pb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-blue-500" />
            </div>
            <h4 className="text-xl font-bold text-foreground">Depth Measurements</h4>
          </div>

          <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
            {/* Units and Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-foreground mb-3 font-medium">
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Depth Units
                  </span>
                </label>
                <select
                  name="depth_units"
                  value={formData.depth_units}
                  onChange={handleInputChange}
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
                  River Width ({formData.depth_units})
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">Width:</span>
                  <InlineNumberEdit
                    value={riverWidth}
                    onSave={handleRiverWidthChange}
                    suffix={formData.depth_units}
                    min={formData.depth_units === 'mm' ? 100 : 0.1}
                    decimals={formData.depth_units === 'mm' ? 0 : 2}
                    className="text-base font-medium border border-border min-w-[100px] flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-foreground mb-3 font-medium">
                  Number of Measurement Points
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">Points:</span>
                  <InlineNumberEdit
                    value={numMeasurements}
                    onSave={handleNumMeasurementsChange}
                    min={2}
                    max={20}
                    decimals={0}
                    className="text-base font-medium border border-border min-w-[80px] flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Measurement Points */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-700 mb-3">Distance from Bank ({formData.depth_units})</h5>
                <div className="space-y-3">
                  {measurementData.map((point, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <label className="text-sm text-gray-600 min-w-[60px]">
                        Point {index + 1}:
                      </label>
                      <InlineNumberEdit
                        value={point.distance_from_bank || 0}
                        onSave={(value) =>
                          handleMeasurementChange(index, 'distance_from_bank', value.toString())
                        }
                        suffix={formData.depth_units}
                        min={0}
                        max={riverWidth}
                        decimals={2}
                        className="flex-1 border border-border min-w-[100px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-700 mb-3">Depth ({formData.depth_units})</h5>
                <div className="space-y-3">
                  {measurementData.map((point, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <label className="text-sm text-gray-600 min-w-[60px]">
                        Point {index + 1}:
                      </label>
                      <InlineNumberEdit
                        value={point.depth || 0}
                        onSave={(value) =>
                          handleMeasurementChange(index, 'depth', value.toString())
                        }
                        suffix={formData.depth_units}
                        min={0}
                        max={formData.depth_units === 'mm' ? 10000 : 10}
                        decimals={2}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =============== SEDIMENTATION SECTION =============== */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b-2 border-amber-500/20 pb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Mountain className="w-5 h-5 text-amber-600" />
            </div>
            <h4 className="text-xl font-bold text-foreground">Sedimentation Analysis</h4>
          </div>

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
                  name="sedimentation_units"
                  value={formData.sedimentation_units}
                  onChange={handleInputChange}
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
                    onSave={(value) => setNumSedimentationMeasurements(Math.round(value))}
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
              />
            </div>

            {/* Sedimentation measurements */}
            <div className="space-y-4">
              <h5 className="font-medium text-gray-700">Sediment Measurements</h5>
              {sedimentationMeasurements.map((measurement, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-amber-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Measurement {index + 1} - Sediment Size ({formData.sedimentation_units})
                    </label>
                    <NumberInput
                      value={measurement.sediment_size.toString()}
                      onChange={(value) =>
                        handleSedimentationMeasurementChange(index, 'sediment_size', value)
                      }
                      placeholder="0.0"
                      step={formData.sedimentation_units === 'mm' ? 0.1 : 0.01}
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sediment Roundness (0-6 scale)
                    </label>
                    <NumberInput
                      value={measurement.sediment_roundness.toString()}
                      onChange={(value) =>
                        handleSedimentationMeasurementChange(index, 'sediment_roundness', value)
                      }
                      placeholder="0"
                      step={0.1}
                      min={0}
                      max={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      0 = Angular, 6 = Well-rounded
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =============== SUBMIT BUTTONS =============== */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-2 border-gray-200">
          <button
            type="submit"
            className="btn-success touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
            disabled={loading}
          >
            {loading ? loadingText : buttonText}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary touch-manipulation flex-1 sm:flex-none"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}