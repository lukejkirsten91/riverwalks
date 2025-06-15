import { MapPin, Calendar, Globe, Edit, Trash2 } from 'lucide-react';
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
      <div className="card-modern-xl p-12 text-center">
        <div className="w-16 h-16 rounded-xl gradient-muted flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No River Walks Yet</h3>
        <p className="text-muted-foreground">Create your first river study to get started with documentation and analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {riverWalks.map((riverWalk) => (
        <div
          key={riverWalk.id}
          className="card-modern-xl p-6 hover:scale-[1.02] transition-transform duration-200"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground truncate mb-2">
                {riverWalk.name}
              </h2>
              
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{formatDate(riverWalk.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">
                    {riverWalk.county ? `${riverWalk.county}, ` : ''}
                    {riverWalk.country || 'UK'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick status */}
            <div className="flex items-center">
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                Study Active
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <button
              onClick={() => onManageSites(riverWalk)}
              className="btn-primary touch-manipulation flex-1 sm:flex-none"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Manage Sites
            </button>
            <button
              onClick={() => onEdit(riverWalk)}
              className="btn-secondary touch-manipulation flex-1 sm:flex-none"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
            <button
              onClick={() => onDelete(riverWalk.id)}
              className="btn-destructive touch-manipulation flex-1 sm:flex-none"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
