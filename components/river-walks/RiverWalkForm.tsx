import { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { LoadingButton } from '../ui/LoadingSpinner';
import type { RiverWalk, RiverWalkFormData } from '../../types';

interface RiverWalkFormProps {
  currentRiverWalk: RiverWalk | null;
  onSubmit: (formData: RiverWalkFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  isTutorialMode?: boolean;
  onFormInteraction?: () => void;
}

export function RiverWalkForm({
  currentRiverWalk,
  onSubmit,
  onCancel,
  loading,
  isTutorialMode = false,
  onFormInteraction,
}: RiverWalkFormProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<RiverWalkFormData>({
    name: currentRiverWalk?.name || '',
    date: currentRiverWalk?.date || new Date().toISOString().split('T')[0],
    country: currentRiverWalk?.country || '',
    county: currentRiverWalk?.county || '',
    notes: currentRiverWalk?.notes || '',
  });

  // Auto-focus the name field when in tutorial mode
  useEffect(() => {
    if (isTutorialMode && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 1000); // Small delay to let tutorial overlay appear first
    }
  }, [isTutorialMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Dismiss tutorial when user starts typing
    if (isTutorialMode && onFormInteraction) {
      onFormInteraction();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="bg-white w-full h-full sm:rounded-lg sm:shadow-modern-lg sm:max-w-4xl sm:w-full sm:max-h-[90vh] overflow-y-auto p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            {currentRiverWalk ? 'Edit River Walk' : 'Add New River Walk'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {currentRiverWalk ? 'Update your river study details' : 'Create a new river study documentation'}
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Primary details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div data-tutorial="river-walk-name">
            <label className="block text-foreground mb-3 font-medium">Study Name</label>
            <input
              ref={nameInputRef}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input-modern"
              placeholder="e.g., River Thames Study"
              required
            />
          </div>
          <div data-tutorial="river-walk-date">
            <label className="block text-foreground mb-3 font-medium">Study Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="input-modern"
              required
            />
          </div>
        </div>

        {/* Location details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-tutorial="river-walk-location">
          <div>
            <label className="block text-foreground mb-3 font-medium">Country</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="input-modern"
              placeholder="e.g., United Kingdom"
            />
          </div>
          <div>
            <label className="block text-foreground mb-3 font-medium">
              County 
              <span className="text-muted-foreground text-sm font-normal ml-2">(Optional)</span>
            </label>
            <input
              type="text"
              name="county"
              value={formData.county}
              onChange={handleInputChange}
              className="input-modern"
              placeholder="e.g., Devon, Yorkshire"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-foreground mb-3 font-medium">
            Notes 
            <span className="text-muted-foreground text-sm font-normal ml-2">(Optional)</span>
          </label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            className="input-modern min-h-[100px] resize-y"
            placeholder="Add any additional notes about this river walk..."
            rows={4}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <LoadingButton
            type="submit"
            loading={loading}
            loadingText="Saving..."
            className="btn-success touch-manipulation"
            data-tutorial="river-walk-save"
          >
            {currentRiverWalk ? 'Update Study' : 'Create River Walk'}
          </LoadingButton>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary touch-manipulation"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
