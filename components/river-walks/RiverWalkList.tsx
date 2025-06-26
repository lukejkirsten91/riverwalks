import { MapPin, Calendar, Globe, Trash2, Archive, RotateCcw, BarChart3, ChevronUp, ChevronDown, CheckCircle, Clock, Link, Users, User } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../lib/utils';
import { InlineEdit } from '../ui/InlineEdit';
import type { RiverWalk } from '../../types';

interface RiverWalkListProps {
  riverWalks: RiverWalk[];
  archivedRiverWalks: RiverWalk[];
  onUpdateField: (id: string, field: keyof RiverWalk, value: string) => Promise<void>;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onManageSites: (riverWalk: RiverWalk) => void;
  onGenerateReport: (riverWalk: RiverWalk) => void;
  onShare?: (riverWalk: RiverWalk) => void;
  isRiverWalkSynced: (riverWalk: RiverWalk) => boolean;
  archiveLoading?: string | null;
}

export function RiverWalkList({
  riverWalks,
  archivedRiverWalks,
  onUpdateField,
  onArchive,
  onRestore,
  onDelete,
  onManageSites,
  onGenerateReport,
  onShare,
  isRiverWalkSynced,
  archiveLoading,
}: RiverWalkListProps) {
  const [showArchived, setShowArchived] = useState(false);

  const renderRiverWalk = (riverWalk: RiverWalk, isArchived: boolean = false) => (
    <div
      key={riverWalk.id}
      className="card-modern-xl p-6 hover:scale-[1.02] transition-transform duration-200"
    >
      {/* Header with inline editing - disable editing for archived items */}
      <div className="flex-1 min-w-0 mb-4">
        <div className="flex items-center gap-2 mb-3">
          {isArchived ? (
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground flex-1">{riverWalk.name}</h2>
          ) : (
            <InlineEdit
              value={riverWalk.name}
              onSave={(value) => onUpdateField(riverWalk.id, 'name', value)}
              className="text-xl sm:text-2xl font-semibold text-foreground flex-1"
              inputClassName="text-xl sm:text-2xl font-semibold"
              placeholder="River walk name"
            />
          )}
          
          {/* Access type and sync status icons */}
          <div className="flex-shrink-0 flex items-center gap-3">
            {/* Access type indicator */}
            {riverWalk.access_type === 'collaborated' ? (
              <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Shared</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded-full">
                <User className="w-4 h-4" />
                <span className="text-xs font-medium">Owned</span>
              </div>
            )}
            
            {/* Sync status icon */}
            {isRiverWalkSynced(riverWalk) ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Synced</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-600">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">Pending</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Metadata with inline editing */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            {isArchived ? (
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
              {isArchived ? (
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
        
        {!isArchived && (
          <button
            onClick={() => onGenerateReport(riverWalk)}
            className="bg-accent/10 hover:bg-accent/20 text-accent px-4 py-3 rounded-lg font-medium transition-all duration-200 border border-accent/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center"
          >
            <BarChart3 className="w-5 h-5 mr-2" />
            Visualize Report
          </button>
        )}
        
        {!isArchived && onShare && (
          <button
            onClick={() => onShare(riverWalk)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-3 rounded-lg font-medium transition-all duration-200 border border-blue-200 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center"
          >
            <Link className="w-5 h-5 mr-2" />
            Share
          </button>
        )}
        
        {isArchived ? (
          // Archived view: Restore and Delete buttons
          <>
            <button
              onClick={() => onRestore(riverWalk.id)}
              disabled={archiveLoading === riverWalk.id}
              className="bg-success/10 hover:bg-success/20 text-success px-4 py-3 rounded-lg font-medium transition-all duration-200 border border-success/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {archiveLoading === riverWalk.id ? (
                <>
                  <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-success/30 border-t-success"></div>
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Restore
                </>
              )}
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
            disabled={archiveLoading === riverWalk.id}
            className="bg-warning/10 hover:bg-warning/20 text-warning px-4 py-3 rounded-lg font-medium transition-all duration-200 border border-warning/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {archiveLoading === riverWalk.id ? (
              <>
                <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-warning/30 border-t-warning"></div>
                Archiving...
              </>
            ) : (
              <>
                <Archive className="w-5 h-5 mr-2" />
                Archive
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  if (riverWalks.length === 0 && archivedRiverWalks.length === 0) {
    return (
      <div className="card-modern-xl p-12 text-center">
        <div className="w-16 h-16 rounded-xl gradient-muted flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No River Walks Yet</h3>
        <p className="text-muted-foreground">
          Create your first river study to get started with documentation and analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active River Walks */}
      {riverWalks.length === 0 ? (
        <div className="card-modern-xl p-12 text-center">
          <div className="w-16 h-16 rounded-xl gradient-muted flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Active River Walks</h3>
          <p className="text-muted-foreground">
            Create your first river study to get started with documentation and analysis.
          </p>
        </div>
      ) : (
        riverWalks.map((riverWalk) => renderRiverWalk(riverWalk, false))
      )}

      {/* Archived Section - Microsoft Style */}
      {archivedRiverWalks.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center justify-between p-4 text-left text-muted-foreground hover:text-foreground bg-gray-50/50 hover:bg-gray-100/50 rounded-lg border border-gray-200/50 transition-all duration-200 touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <Archive className="w-4 h-4" />
              <span className="text-sm font-medium">
                View archived ({archivedRiverWalks.length})
              </span>
            </div>
            {showArchived ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Archived Items - Expandable */}
          {showArchived && (
            <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200">
              {archivedRiverWalks.map((riverWalk) => renderRiverWalk(riverWalk, true))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
