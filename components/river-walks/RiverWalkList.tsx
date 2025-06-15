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
          {/* Mobile-first layout: stack on small screens, side-by-side on larger screens */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold truncate">
                {riverWalk.name}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                {formatDate(riverWalk.date)}
              </p>
              <p className="text-gray-600 text-sm sm:text-base">
                {riverWalk.county ? `${riverWalk.county}, ` : ''}
                {riverWalk.country || 'UK'}
              </p>
            </div>

            {/* Action buttons - stack on mobile, horizontal on desktop */}
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 sm:gap-0">
              <button
                onClick={() => onManageSites(riverWalk)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-medium touch-manipulation flex items-center justify-center"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Sites
              </button>
              <button
                onClick={() => onEdit(riverWalk)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg font-medium touch-manipulation"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(riverWalk.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-medium touch-manipulation"
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
