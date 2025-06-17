import { useState, useEffect } from 'react';
import { MapPin, Ruler, Camera, Droplets, Mountain, CloudSun, TreePine } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { InlineNumberEdit } from '../ui/InlineNumberEdit';
import { FileUpload } from '../ui/FileUpload';
import type { Site, SiteFormData, MeasurementPointFormData, SedimentationMeasurement } from '../../types';

interface EnhancedSiteFormProps {
  editingSite?: Site | null;
  onSubmit: (
    formData: SiteFormData, 
    measurementData: MeasurementPointFormData[],
    numMeasurements: number,
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

export function EnhancedSiteForm({
  editingSite,
  onSubmit,
  onCancel,
  loading,
}: EnhancedSiteFormProps) {
  // Site details form data
  const [formData, setFormData] = useState<SiteFormData>({
    site_name: editingSite?.site_name || `Site ${(editingSite?.site_number ?? 1)}`,
    river_width: editingSite ? editingSite.river_width.toString() : '',
    latitude: editingSite?.latitude ? editingSite.latitude.toString() : '',
    longitude: editingSite?.longitude ? editingSite.longitude.toString() : '',
    notes: editingSite?.notes || '',
    weather_conditions: editingSite?.weather_conditions || '',
    land_use: editingSite?.land_use || '',
    units: editingSite?.units || 'm',
  });

  // Site photo handling
  const [sitePhotoFile, setSitePhotoFile] = useState<File | null>(null);
  const [sitePhotoPreview, setSitePhotoPreview] = useState<string | null>(editingSite?.photo_url || null);
  const [removeSitePhoto, setRemoveSitePhoto] = useState(false);

  // Measurement data
  const [numMeasurements, setNumMeasurements] = useState(
    editingSite?.measurement_points?.length || 5
  );
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
    const riverWidth = parseFloat(formData.river_width) || 10;
    
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
  }, [numMeasurements, formData.river_width, editingSite]);

  // Initialize sedimentation data
  useEffect(() => {
    if (editingSite?.sedimentation_data?.measurements) {
      setSedimentationMeasurements(editingSite.sedimentation_data.measurements);
      setNumSedimentationMeasurements(editingSite.sedimentation_data.measurements.length);
    } else {
      // Initialize with empty measurements
      const newMeasurements = Array.from({ length: numSedimentationMeasurements }, () => ({
        sediment_size: '',
        sediment_roundness: 'rounded' as const,
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

  const handleSedimentationMeasurementChange = (index: number, field: keyof SedimentationMeasurement, value: string) => {
    const newData = [...sedimentationMeasurements];
    newData[index] = {
      ...newData[index],
      [field]: value,
    };
    setSedimentationMeasurements(newData);
  };

  const handleNumMeasurementsChange = (num: number) => {
    setNumMeasurements(num);
  };

  const handleRiverWidthChange = (width: number) => {
    setFormData(prev => ({ ...prev, river_width: width.toString() }));
    
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
    <div className="card-modern-xl p-6 bg-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center gradient-primary text-white">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-muted-foreground text-sm">
            Complete site details, measurements, and sedimentation data
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Site Details Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h4 className="text-lg font-semibold">Site Details</h4>
          </div>

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
              <label className="block text-foreground mb-3 font-medium">Units</label>
              <select
                name="units"
                value={formData.units}
                onChange={handleInputChange}
                className="input-modern"
                required
              >
                <option value="m">Meters (m)</option>
                <option value="cm">Centimeters (cm)</option>
                <option value="mm">Millimeters (mm)</option>
                <option value="ft">Feet (ft)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-foreground mb-3 font-medium">
                <span className="flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  River Width ({formData.units})
                </span>
              </label>
              <NumberInput
                value={formData.river_width}
                onChange={(value) =>
                  handleInputChange({
                    target: { name: 'river_width', value },
                  } as any)
                }
                placeholder="e.g., 3.5"
                step={formData.units === 'mm' ? 1 : 0.1}
                min={formData.units === 'mm' ? 100 : 0.1}
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
          <div>
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
          <div>
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

        {/* Depth Measurements Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Droplets className="w-5 h-5 text-blue-500" />
            <h4 className="text-lg font-semibold">Depth Measurements</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-foreground mb-3 font-medium">
                River Width ({formData.units})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Width:</span>
                <InlineNumberEdit
                  value={parseFloat(formData.river_width) || 0}
                  onSave={handleRiverWidthChange}
                  suffix={formData.units}
                  min={formData.units === 'mm' ? 100 : 0.1}
                  decimals={formData.units === 'mm' ? 0 : 2}
                  className="text-base font-medium border border-border min-w-[80px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-foreground mb-3 font-medium">
                Number of Measurement Points
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Points:</span>
                <InlineNumberEdit
                  value={numMeasurements}
                  onSave={handleNumMeasurementsChange}
                  min={2}
                  max={20}
                  decimals={0}
                  className="text-base font-medium border border-border min-w-[60px]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-gray-700 mb-3">Distance from Bank ({formData.units})</h5>
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
                      suffix={formData.units}
                      min={0}
                      max={parseFloat(formData.river_width) || 10}
                      decimals={2}
                      className="flex-1 border border-border min-w-[80px]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-700 mb-3">Depth ({formData.units})</h5>
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
                      suffix={formData.units}
                      min={0}
                      max={formData.units === 'mm' ? 10000 : 10}
                      decimals={2}
                      className="flex-1 bg-muted/30 hover:bg-muted/50 px-3 py-2 rounded-lg border border-border"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sedimentation Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Mountain className="w-5 h-5 text-amber-600" />
            <h4 className="text-lg font-semibold">Sedimentation</h4>
          </div>

          {/* Sedimentation Photo */}
          <div>
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

          {/* Number of sedimentation measurements */}
          <div>
            <label className="block text-foreground mb-3 font-medium">
              Number of Sedimentation Measurements
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Count:</span>
              <InlineNumberEdit
                value={numSedimentationMeasurements}
                onSave={(value) => setNumSedimentationMeasurements(Math.round(value))}
                min={1}
                max={10}
                decimals={0}
                className="text-base font-medium border border-border min-w-[60px]"
              />
            </div>
          </div>

          {/* Sedimentation measurements */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-700">Sediment Measurements</h5>
            {sedimentationMeasurements.map((measurement, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50 rounded-lg border">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Measurement {index + 1} - Sediment Size ({formData.units})
                  </label>
                  <input
                    type="text"
                    value={measurement.sediment_size}
                    onChange={(e) =>
                      handleSedimentationMeasurementChange(index, 'sediment_size', e.target.value)
                    }
                    className="input-modern"
                    placeholder="e.g., 2.5, 15-20, fine sand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sediment Roundness
                  </label>
                  <select
                    value={measurement.sediment_roundness}
                    onChange={(e) =>
                      handleSedimentationMeasurementChange(index, 'sediment_roundness', e.target.value)
                    }
                    className="input-modern"
                  >
                    <option value="angular">Angular</option>
                    <option value="sub-angular">Sub-angular</option>
                    <option value="sub-rounded">Sub-rounded</option>
                    <option value="rounded">Rounded</option>
                    <option value="well-rounded">Well-rounded</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
          <button
            type="submit"
            className="btn-success touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? loadingText : buttonText}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary touch-manipulation"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}