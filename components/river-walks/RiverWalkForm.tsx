import { useState } from 'react';
import { MapPin } from 'lucide-react';
import type { RiverWalk, RiverWalkFormData } from '../../types';

interface RiverWalkFormProps {
  currentRiverWalk: RiverWalk | null;
  onSubmit: (formData: RiverWalkFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function RiverWalkForm({
  currentRiverWalk,
  onSubmit,
  onCancel,
  loading,
}: RiverWalkFormProps) {
  const [formData, setFormData] = useState<RiverWalkFormData>({
    name: currentRiverWalk?.name || '',
    date: currentRiverWalk?.date || new Date().toISOString().split('T')[0],
    country: currentRiverWalk?.country || 'UK',
    county: currentRiverWalk?.county || '',
    notes: currentRiverWalk?.notes || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="card-modern-xl p-6 sm:p-8">
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
          <div>
            <label className="block text-foreground mb-3 font-medium">Study Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input-modern"
              placeholder="e.g., River Thames Study"
              required
            />
          </div>
          <div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          <button
            type="submit"
            className="btn-success touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Saving...' : currentRiverWalk ? 'Update Study' : 'Create Study'}
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
