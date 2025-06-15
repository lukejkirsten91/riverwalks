import { useState } from 'react';
import { NumberInput } from '../ui/NumberInput';
import type { Site, SiteFormData } from '../../types';

interface SiteFormProps {
  editingSite?: Site | null;
  onSubmit: (formData: SiteFormData) => Promise<void>;
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
    river_width: editingSite ? editingSite.river_width.toString() : '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const bgColor = editingSite ? 'bg-yellow-50' : 'bg-gray-50';
  const title = editingSite ? 'Edit Site' : 'Add New Site';
  const buttonText = editingSite ? 'Update Site' : 'Create Site';
  const loadingText = editingSite ? 'Updating...' : 'Creating...';

  return (
    <div className={`${bgColor} p-4 sm:p-6 rounded-lg mb-6 border`}>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <form onSubmit={handleSubmit}>
        {/* Use grid for better mobile layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Site Name
            </label>
            <input
              type="text"
              name="site_name"
              value={formData.site_name}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder="e.g., Upstream, Meander, Confluence"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              River Width (meters)
            </label>
            <NumberInput
              value={formData.river_width}
              onChange={(value) =>
                handleInputChange({
                  target: { name: 'river_width', value },
                } as any)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder="e.g., 3.5"
              step={0.1}
              min={0.1}
              required
            />
          </div>
        </div>

        {/* Mobile-first button layout */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? loadingText : buttonText}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium touch-manipulation"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
