import { MapPin, Calendar, Globe, Trash2, Archive, RotateCcw, BarChart3 } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { InlineEdit } from '../ui/InlineEdit';
import type { RiverWalk } from '../../types';

interface RiverWalkListProps {
  riverWalks: RiverWalk[];
  onUpdateField: (id: string, field: keyof RiverWalk, value: string) => Promise<void>;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onManageSites: (riverWalk: RiverWalk) => void;
  onGenerateReport: (riverWalk: RiverWalk) => void;
  showArchived: boolean;
}

export function RiverWalkList({
  riverWalks,
  onUpdateField,
  onArchive,
  onRestore,
  onDelete,
  onManageSites,
  onGenerateReport,
  showArchived,
}: RiverWalkListProps) {
  if (riverWalks.length === 0) {
    return (
      <div className="card-modern-xl p-12 text-center">
        <div className="w-16 h-16 rounded-xl gradient-muted flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {showArchived ? 'No Archived River Walks' : 'No River Walks Yet'}
        </h3>
        <p className="text-muted-foreground">
          {showArchived 
            ? 'You haven\'t archived any river walks yet.' 
            : 'Create your first river study to get started with documentation and analysis.'
          }
        </p>
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
          {/* Header with inline editing - disable editing for archived items */}
          <div className="flex-1 min-w-0 mb-4">
            {showArchived ? (
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">{riverWalk.name}</h2>
            ) : (
              <InlineEdit
                value={riverWalk.name}
                onSave={(value) => onUpdateField(riverWalk.id, 'name', value)}
                className="text-xl sm:text-2xl font-semibold text-foreground mb-3"
                inputClassName="text-xl sm:text-2xl font-semibold"
                placeholder="River walk name"
              />
            )}
            
            {/* Metadata with inline editing */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0" />
                {showArchived ? (
                  <span className="text-sm">{riverWalk.date}</span>
                ) : (
                  <InlineEdit
                    value={riverWalk.date}
                    onSave={(value) => onUpdateField(riverWalk.id, 'date', value)}
                    type="date"
                    className="text-sm"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4 shrink-0" />
                <div className="flex items-center gap-1 text-sm">
                  {showArchived ? (
                    <span>{riverWalk.county ? `${riverWalk.county}, ` : ''}{riverWalk.country || 'UK'}</span>
                  ) : (
                    <>
                      <InlineEdit
                        value={riverWalk.county || ''}
                        onSave={(value) => onUpdateField(riverWalk.id, 'county', value)}
                        placeholder="County (optional)"
                        className="text-sm"
                      />
                      <span>,</span>
                      <InlineEdit
                        value={riverWalk.country || 'UK'}
                        onSave={(value) => onUpdateField(riverWalk.id, 'country', value)}
                        placeholder="Country"
                        className="text-sm"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <button
              onClick={() => onManageSites(riverWalk)}
              className="btn-primary touch-manipulation flex-1 sm:flex-none"
            >
              <MapPin className="w-5 h-5 mr-2" />
              Sites & Measurements
            </button>
            
            {!showArchived && (
              <button
                onClick={() => onGenerateReport(riverWalk)}
                className="bg-accent/10 hover:bg-accent/20 text-accent px-4 py-3 rounded-lg font-medium transition-all duration-200 border border-accent/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Visualize Report
              </button>
            )}
            
            {showArchived ? (
              // Archived view: Restore and Delete buttons
              <>
                <button
                  onClick={() => onRestore(riverWalk.id)}
                  className="bg-success/10 hover:bg-success/20 text-success px-4 py-3 rounded-lg font-medium transition-all duration-200 border border-success/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Restore
                </button>
                <button
                  onClick={() => onDelete(riverWalk.id)}
                  className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-4 py-3 rounded-lg font-medium transition-all duration-200 border border-destructive/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Delete Forever
                </button>
              </>
            ) : (
              // Active view: Archive button
              <button
                onClick={() => onArchive(riverWalk.id)}
                className="bg-warning/10 hover:bg-warning/20 text-warning px-4 py-3 rounded-lg font-medium transition-all duration-200 border border-warning/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center"
              >
                <Archive className="w-5 h-5 mr-2" />
                Archive
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
