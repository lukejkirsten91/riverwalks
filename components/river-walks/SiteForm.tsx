import { useState } from 'react';
import { MapPin, Ruler } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { FileUpload } from '../ui/FileUpload';
import type { Site, SiteFormData } from '../../types';

interface SiteFormProps {
  editingSite?: Site | null;
  onSubmit: (formData: SiteFormData, photoFile?: File, removePhoto?: boolean) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function SiteForm({
  editingSite,
  onSubmit,
  onCancel,
  loading,
}: SiteFormProps) {
  const [formData, setFormData] = useState<SiteFormData>({
    site_name: editingSite?.site_name || '',
    latitude: editingSite?.latitude ? editingSite.latitude.toString() : '',
    longitude: editingSite?.longitude ? editingSite.longitude.toString() : '',
    notes: editingSite?.notes || '',
    weather_conditions: editingSite?.weather_conditions || '',
    land_use: editingSite?.land_use || '',
    depth_units: editingSite?.depth_units || 'm',
    sedimentation_units: editingSite?.sedimentation_units || 'mm',
  });

  const [riverWidth, setRiverWidth] = useState(editingSite?.river_width?.toString() || '');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(editingSite?.photo_url || null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handlePhotoSelect = (file: File) => {
    setPhotoFile(file);
    setRemovePhoto(false); // Reset remove flag when new photo is selected
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };

  const handlePhotoRemove = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true); // Flag that photo should be removed
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // For backward compatibility, we need to add the river_width back
    const submitData = {
      ...formData,
      river_width: riverWidth
    };
    await onSubmit(submitData as any, photoFile || undefined, removePhoto);
  };

  const title = editingSite ? 'Edit Site' : 'Add New Site';
  const buttonText = editingSite ? 'Update Site' : 'Create Site';
  const loadingText = editingSite ? 'Updating...' : 'Creating...';
  const bgColor = editingSite ? 'bg-warning/5 border-warning/20' : 'bg-card';

  return (
    <div className={`card-modern-xl p-6 ${bgColor}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          editingSite ? 'bg-warning text-warning-foreground' : 'gradient-primary text-white'
        }`}>
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-muted-foreground text-sm">
            {editingSite ? 'Update site measurement details' : 'Add a new measurement site to this river walk'}
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-foreground mb-3 font-medium">
              <span className="flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                River Width (meters)
              </span>
            </label>
            <NumberInput
              value={riverWidth}
              onChange={(value) => setRiverWidth(value)}
              placeholder="e.g., 3.5"
              step={0.1}
              min={0.1}
              required
            />
            <p className="text-muted-foreground text-xs mt-2">
              Measurement points will be evenly distributed across this width
            </p>
          </div>
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-foreground mb-3 font-medium">
              Latitude 
              <span className="text-muted-foreground text-sm font-normal ml-2">(Optional)</span>
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
            <p className="text-muted-foreground text-xs mt-2">
              GPS latitude coordinate (-90 to 90)
            </p>
          </div>
          
          <div>
            <label className="block text-foreground mb-3 font-medium">
              Longitude 
              <span className="text-muted-foreground text-sm font-normal ml-2">(Optional)</span>
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
            <p className="text-muted-foreground text-xs mt-2">
              GPS longitude coordinate (-180 to 180)
            </p>
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-foreground mb-3 font-medium">
            Site Photo 
            <span className="text-muted-foreground text-sm font-normal ml-2">(Optional)</span>
          </label>
          <FileUpload
            onFileSelect={handlePhotoSelect}
            onFileRemove={handlePhotoRemove}
            currentImageUrl={photoPreview}
            disabled={loading}
            loading={loading}
            loadingText="Uploading site photo..."
          />
          <p className="text-muted-foreground text-xs mt-2">
            Add a photo of this measurement site for reference
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-foreground mb-3 font-medium">
            Notes 
            <span className="text-muted-foreground text-sm font-normal ml-2">(Optional)</span>
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="input-modern min-h-[100px] resize-y"
            placeholder="Add notes about this site's location, conditions, or characteristics..."
            rows={4}
          />
          <p className="text-muted-foreground text-xs mt-2">
            Document any observations about this measurement site
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
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
