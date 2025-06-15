import { useState } from 'react';
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
    river_width: editingSite?.river_width.toString() || '',
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
    <div className={`${bgColor} p-6 rounded-lg mb-6`}>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Site Name</label>
          <input
            type="text"
            name="site_name"
            value={formData.site_name}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            placeholder="e.g., Upstream, Meander, Confluence"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            River Width (meters)
          </label>
          <input
            type="number"
            name="river_width"
            value={formData.river_width}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            placeholder="e.g., 3.5"
            step="0.1"
            min="0.1"
            required
          />
        </div>
        <div className="space-x-2">
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? loadingText : buttonText}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
