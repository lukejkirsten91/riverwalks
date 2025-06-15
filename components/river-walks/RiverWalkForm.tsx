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
    <div className="bg-gray-100 p-6 rounded-lg mb-6">
      <h2 className="text-xl font-semibold mb-4">
        {currentRiverWalk ? 'Edit River Walk' : 'Add New River Walk'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Country</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            placeholder="UK"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">County (Optional)</label>
          <input
            type="text"
            name="county"
            value={formData.county}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="space-x-2">
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
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
