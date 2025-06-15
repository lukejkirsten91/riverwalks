import { useState } from 'react';
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

  return (
    <div className="bg-gray-50 p-4 sm:p-6 rounded-lg mb-6 border">
      <h2 className="text-lg sm:text-xl font-semibold mb-4">
        {currentRiverWalk ? 'Edit River Walk' : 'Add New River Walk'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Use grid for better mobile layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder="e.g., River Thames Study"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Country
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder="UK"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              County <span className="text-gray-500 text-sm">(Optional)</span>
            </label>
            <input
              type="text"
              name="county"
              value={formData.county}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder="e.g., Devon, Yorkshire"
            />
          </div>
        </div>

        {/* Mobile-first button layout */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 pt-2">
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
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
