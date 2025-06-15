import { MapPin } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import type { RiverWalk } from '../../types';

interface RiverWalkListProps {
  riverWalks: RiverWalk[];
  onEdit: (riverWalk: RiverWalk) => void;
  onDelete: (id: string) => void;
  onManageSites: (riverWalk: RiverWalk) => void;
}

export function RiverWalkList({
  riverWalks,
  onEdit,
  onDelete,
  onManageSites,
}: RiverWalkListProps) {
  if (riverWalks.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p>No river walks found. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {riverWalks.map((riverWalk) => (
        <div
          key={riverWalk.id}
          className="border rounded-lg p-4 bg-white shadow-sm"
        >
          <div className="flex justify-between">
            <div>
              <h2 className="text-xl font-semibold">{riverWalk.name}</h2>
              <p className="text-gray-600">{formatDate(riverWalk.date)}</p>
              <p className="text-gray-600">
                {riverWalk.county ? `${riverWalk.county}, ` : ''}
                {riverWalk.country || 'UK'}
              </p>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => onManageSites(riverWalk)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
              >
                <MapPin className="inline w-4 h-4 mr-1" />
                Sites
              </button>
              <button
                onClick={() => onEdit(riverWalk)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(riverWalk.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
