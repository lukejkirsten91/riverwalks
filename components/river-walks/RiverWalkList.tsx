import { MapPin, Calendar, Globe, Trash2, Archive, RotateCcw, BarChart3, ChevronUp, ChevronDown, CheckCircle, Clock, Link, Users, User, Edit, Eye, Crown, Share } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../lib/utils';
import { InlineEdit } from '../ui/InlineEdit';
import { CollaboratorAvatars } from '../ui/CollaboratorAvatars';
import { useCollaboratorInfo } from '../../hooks/useCollaboratorInfo';
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
  const [showMyRiverWalks, setShowMyRiverWalks] = useState(true);
  const [showSharedWithMe, setShowSharedWithMe] = useState(true);
  const [showSharedByMe, setShowSharedByMe] = useState(true);
  
  // Get collaborator information for all river walks
  const { collaboratorInfo, getCollaboratorInfo } = useCollaboratorInfo(riverWalks);

  const renderRiverWalk = (riverWalk: RiverWalk, isArchived: boolean = false) => {
    // Permission checks for button visibility
    const canManageSites = !isArchived && riverWalk.collaboration_role !== 'viewer';
    const canShare = !isArchived && onShare && (
      riverWalk.collaboration_role === 'owner' || 
      (!riverWalk.collaboration_role && riverWalk.access_type === 'owned') ||
      (!riverWalk.collaboration_role && !riverWalk.access_type) // Default to owned for river walks without collaboration metadata
    );
    const canArchive = !isArchived && (
      riverWalk.collaboration_role === 'owner' || 
      (!riverWalk.collaboration_role && riverWalk.access_type === 'owned') ||
      (!riverWalk.collaboration_role && !riverWalk.access_type) // Default to owned for river walks without collaboration metadata
    );
    
    // Get collaborator info for this river walk
    const collaborators = getCollaboratorInfo(riverWalk.id);
    
    return (
    <div
      key={riverWalk.id}
      className="card-modern-xl p-4 sm:p-6 hover:scale-[1.02] transition-transform duration-200"
    >
      {/* Header with inline editing - disable editing for archived items */}
      <div className="flex-1 min-w-0 mb-4">
        <div className="flex items-start sm:items-center gap-2 mb-3 flex-col sm:flex-row">
          <div className="flex-1 min-w-0 w-full">
            {isArchived || riverWalk.collaboration_role === 'viewer' ? (
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground break-words">{riverWalk.name}</h2>
            ) : (
              <InlineEdit
                value={riverWalk.name}
                onSave={(value) => onUpdateField(riverWalk.id, 'name', value)}
                className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground"
                inputClassName="text-lg sm:text-xl lg:text-2xl font-semibold w-full"
                placeholder="River walk name"
              />
            )}
          </div>
          
          {/* Access type and sync status icons */}
          <div className="flex-shrink-0 flex items-center gap-2 flex-wrap">
            {/* Role-based access indicator */}
            {riverWalk.collaboration_role === 'owner' || (!riverWalk.collaboration_role && riverWalk.access_type === 'owned') || (!riverWalk.collaboration_role && !riverWalk.access_type) ? (
              <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs font-medium hidden sm:inline">Owner</span>
              </div>
            ) : riverWalk.collaboration_role === 'editor' ? (
              <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs font-medium hidden sm:inline">Editor</span>
              </div>
            ) : riverWalk.collaboration_role === 'viewer' ? (
              <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs font-medium hidden sm:inline">Viewer</span>
              </div>
            ) : riverWalk.access_type === 'collaborated' ? (
              <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs font-medium hidden sm:inline">Editor</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded-full">
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs font-medium hidden sm:inline">Owner</span>
              </div>
            )}
            
            {/* Sync status icon */}
            {isRiverWalkSynced(riverWalk) ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs font-medium hidden sm:inline">Synced</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-600">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs font-medium hidden sm:inline">Pending</span>
              </div>
            )}
          </div>
          
          {/* Collaborator avatars - show for owned river walks with collaborators */}
          {collaborators && (
            <div className="mt-2">
              <CollaboratorAvatars collaboratorInfo={collaborators} size="sm" maxVisible={3} />
            </div>
          )}
        </div>
        
        {/* Metadata with inline editing */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            {isArchived || riverWalk.collaboration_role === 'viewer' ? (
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
            <div className="flex items-center gap-1 text-sm flex-wrap">
              {isArchived || riverWalk.collaboration_role === 'viewer' ? (
                <span className="break-words">{riverWalk.county ? `${riverWalk.county}, ` : ''}{riverWalk.country || 'UK'}</span>
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
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-border">
        {canManageSites && (
          <button
            onClick={() => onManageSites(riverWalk)}
            className="btn-primary touch-manipulation flex-1 sm:flex-none text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-3"
          >
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            <span className="truncate">Sites & Measurements</span>
          </button>
        )}
        
        {!isArchived && (
          <button
            onClick={() => onGenerateReport(riverWalk)}
            className="bg-accent/10 hover:bg-accent/20 text-accent px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition-all duration-200 border border-accent/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center text-sm sm:text-base"
          >
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            <span className="truncate">Visualize Report</span>
          </button>
        )}
        
        {canShare && (
          <button
            onClick={() => onShare(riverWalk)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition-all duration-200 border border-blue-200 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center text-sm sm:text-base"
          >
            <Link className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            <span className="truncate">Share</span>
          </button>
        )}
        
        {isArchived ? (
          // Archived view: Restore and Delete buttons (only for owners)
          riverWalk.collaboration_role === 'owner' || (!riverWalk.collaboration_role && riverWalk.access_type === 'owned') || (!riverWalk.collaboration_role && !riverWalk.access_type) ? (
            <>
              <button
                onClick={() => onRestore(riverWalk.id)}
                disabled={archiveLoading === riverWalk.id}
                className="bg-success/10 hover:bg-success/20 text-success px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition-all duration-200 border border-success/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {archiveLoading === riverWalk.id ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 animate-spin rounded-full border-2 border-success/30 border-t-success"></div>
                    <span className="truncate">Restoring...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                    <span className="truncate">Restore</span>
                  </>
                )}
              </button>
              <button
                onClick={() => onDelete(riverWalk.id)}
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition-all duration-200 border border-destructive/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center text-sm sm:text-base"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="truncate">Delete Forever</span>
              </button>
            </>
          ) : null
        ) : (
          // Active view: Archive button (only for owners)
          canArchive && (
            <button
              onClick={() => onArchive(riverWalk.id)}
              disabled={archiveLoading === riverWalk.id}
              className="bg-warning/10 hover:bg-warning/20 text-warning px-3 py-2 sm:px-4 sm:py-3 rounded-lg font-medium transition-all duration-200 border border-warning/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {archiveLoading === riverWalk.id ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 animate-spin rounded-full border-2 border-warning/30 border-t-warning"></div>
                  <span className="truncate">Archiving...</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="truncate">Archive</span>
                </>
              )}
            </button>
          )
        )}
      </div>
    </div>
    );
  };

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

  // Group river walks into three categories
  const myRiverWalks = riverWalks.filter(rw => {
    const isOwned = rw.collaboration_role === 'owner' || 
                   (!rw.collaboration_role && rw.access_type === 'owned') ||
                   (!rw.collaboration_role && !rw.access_type);
    const hasCollaborators = getCollaboratorInfo(rw.id)?.hasCollaborators || false;
    return isOwned && !hasCollaborators; // Owned but not shared with others
  });
  
  const sharedWithMe = riverWalks.filter(rw => 
    rw.collaboration_role === 'editor' || 
    rw.collaboration_role === 'viewer' ||
    (!rw.collaboration_role && rw.access_type === 'collaborated')
  );
  
  const sharedByMe = riverWalks.filter(rw => {
    const isOwned = rw.collaboration_role === 'owner' || 
                   (!rw.collaboration_role && rw.access_type === 'owned') ||
                   (!rw.collaboration_role && !rw.access_type);
    const hasCollaborators = getCollaboratorInfo(rw.id)?.hasCollaborators || false;
    return isOwned && hasCollaborators; // Owned and shared with others
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* My River Walks Section - Private ones not shared with others */}
      {myRiverWalks.length > 0 && (
        <div>
          <button
            onClick={() => setShowMyRiverWalks(!showMyRiverWalks)}
            className="w-full flex items-center justify-between p-3 sm:p-4 text-left bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-150 rounded-lg border border-purple-200 transition-all duration-200 touch-manipulation mb-3 sm:mb-4"
          >
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              <h2 className="text-base sm:text-lg font-semibold text-foreground">My River Walks</h2>
              <span className="text-xs sm:text-sm text-muted-foreground">({myRiverWalks.length})</span>
            </div>
            {showMyRiverWalks ? (
              <ChevronUp className="w-4 h-4 text-purple-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-purple-600" />
            )}
          </button>
          <div className={`accordion-content ${showMyRiverWalks ? 'accordion-content-visible' : 'accordion-content-hidden'}`}>
            <div className="space-y-3 sm:space-y-4 pl-3 sm:pl-4 border-l-2 border-purple-200">
              {myRiverWalks.map((riverWalk) => renderRiverWalk(riverWalk, false))}
            </div>
          </div>
        </div>
      )}

      {/* Shared with Me Section */}
      {sharedWithMe.length > 0 && (
        <div>
          <button
            onClick={() => setShowSharedWithMe(!showSharedWithMe)}
            className="w-full flex items-center justify-between p-3 sm:p-4 text-left bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 rounded-lg border border-blue-200 transition-all duration-200 touch-manipulation mb-3 sm:mb-4"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Shared with Me</h2>
              <span className="text-xs sm:text-sm text-muted-foreground">({sharedWithMe.length})</span>
            </div>
            {showSharedWithMe ? (
              <ChevronUp className="w-4 h-4 text-blue-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-blue-600" />
            )}
          </button>
          <div className={`accordion-content ${showSharedWithMe ? 'accordion-content-visible' : 'accordion-content-hidden'}`}>
            <div className="space-y-3 sm:space-y-4 pl-3 sm:pl-4 border-l-2 border-blue-200">
              {sharedWithMe.map((riverWalk) => renderRiverWalk(riverWalk, false))}
            </div>
          </div>
        </div>
      )}

      {/* River Walks I've Shared Section */}
      {sharedByMe.length > 0 && (
        <div>
          <button
            onClick={() => setShowSharedByMe(!showSharedByMe)}
            className="w-full flex items-center justify-between p-3 sm:p-4 text-left bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-150 rounded-lg border border-green-200 transition-all duration-200 touch-manipulation mb-3 sm:mb-4"
          >
            <div className="flex items-center gap-2">
              <Share className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <h2 className="text-base sm:text-lg font-semibold text-foreground">River Walks I've Shared</h2>
              <span className="text-xs sm:text-sm text-muted-foreground">({sharedByMe.length})</span>
            </div>
            {showSharedByMe ? (
              <ChevronUp className="w-4 h-4 text-green-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-green-600" />
            )}
          </button>
          <div className={`accordion-content ${showSharedByMe ? 'accordion-content-visible' : 'accordion-content-hidden'}`}>
            <div className="space-y-3 sm:space-y-4 pl-3 sm:pl-4 border-l-2 border-green-200">
              {sharedByMe.map((riverWalk) => renderRiverWalk(riverWalk, false))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {riverWalks.length === 0 && (
        <div className="card-modern-xl p-12 text-center">
          <div className="w-16 h-16 rounded-xl gradient-muted flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Active River Walks</h3>
          <p className="text-muted-foreground">
            Create your first river study to get started with documentation and analysis.
          </p>
        </div>
      )}

      {/* Archived Section - Microsoft Style */}
      {archivedRiverWalks.length > 0 && (
        <div className="mt-6 sm:mt-8">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center justify-between p-3 sm:p-4 text-left text-muted-foreground hover:text-foreground bg-gray-50/50 hover:bg-gray-100/50 rounded-lg border border-gray-200/50 transition-all duration-200 touch-manipulation"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <Archive className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">
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
          <div className={`accordion-content ${showArchived ? 'accordion-content-visible' : 'accordion-content-hidden'}`}>
            <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 pl-3 sm:pl-4 border-l-2 border-gray-200">
              {archivedRiverWalks.map((riverWalk) => renderRiverWalk(riverWalk, true))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
