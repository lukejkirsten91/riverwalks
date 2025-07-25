import { MapPin, Calendar, Globe, Trash2, Archive, RotateCcw, BarChart3, CheckCircle, Clock, Link, Users, User, Edit, Eye, Crown, Share, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../lib/utils';
import { InlineEdit } from '../ui/InlineEdit';
import { CollaboratorAvatars } from '../ui/CollaboratorAvatars';
import { RiverWalkTabs } from './RiverWalkTabs';
import { useCollaboratorInfo } from '../../hooks/useCollaboratorInfo';
import { useSubscription, canAccessReports, canAccessAdvancedFeatures } from '../../hooks/useSubscription';
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
  onGeneratePrintTemplate: (riverWalk: RiverWalk) => void;
  onShare?: (riverWalk: RiverWalk) => void;
  onManageCollaborators?: (riverWalk: RiverWalk) => void;
  onUpgradePrompt: (feature: string) => void;
  isRiverWalkSynced: (riverWalk: RiverWalk) => boolean;
  archiveLoading?: string | null;
  templateLoading?: string | null;
  tutorialActive?: boolean;
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
  onGeneratePrintTemplate,
  onShare,
  onManageCollaborators,
  onUpgradePrompt,
  isRiverWalkSynced,
  archiveLoading,
  templateLoading,
  tutorialActive = false,
}: RiverWalkListProps) {
  const [activeTab, setActiveTab] = useState('all');
  
  // Get collaborator information for all river walks
  const { collaboratorInfo, getCollaboratorInfo } = useCollaboratorInfo(riverWalks);
  
  // Get subscription status
  const subscription = useSubscription();

  // Helper function to check if user is online
  const isOnline = () => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  };

  const renderRiverWalk = (riverWalk: RiverWalk, isArchived: boolean = false, index: number = 0) => {
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
      className="card-modern-xl p-2 sm:p-3 hover:scale-[1.01] transition-all duration-200"
      data-tutorial={(() => {
        // For tutorial, target the first river walk in the "My River Walks" section
        const isInMyRiverWalks = riverWalk.collaboration_role === 'owner' || 
                                (!riverWalk.collaboration_role && riverWalk.access_type === 'owned') ||
                                (!riverWalk.collaboration_role && !riverWalk.access_type);
        const shouldHaveTutorial = tutorialActive && !isArchived && index === 0 && isInMyRiverWalks;
        if (shouldHaveTutorial) {
          console.log('✅ Setting tutorial attribute on river walk:', riverWalk.name, 'at index:', index, 'tutorialActive:', tutorialActive);
        }
        return shouldHaveTutorial ? "created-river-walk" : undefined;
      })()}
    >
      {/* Header with inline editing - disable editing for archived items */}
      <div className="flex-1 min-w-0 mb-2">
        <div className="flex items-start sm:items-center gap-2 mb-1 flex-col sm:flex-row">
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={riverWalk.name}
              onSave={(newValue) => onUpdateField(riverWalk.id, 'name', newValue)}
              className="text-lg sm:text-xl font-bold text-foreground mb-0.5"
              placeholder="Enter river walk name"
              disabled={isArchived}
            />
          </div>
          
          {/* Status and Collaboration Indicators */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Ownership/Collaboration Role Badge */}
            {(() => {
              // Determine ownership status
              const isOwner = riverWalk.collaboration_role === 'owner' || 
                             (!riverWalk.collaboration_role && riverWalk.access_type === 'owned') ||
                             (!riverWalk.collaboration_role && !riverWalk.access_type);
              
              const isEditor = riverWalk.collaboration_role === 'editor';
              const isViewer = riverWalk.collaboration_role === 'viewer';
              
              // Always show a role badge
              if (isOwner) {
                return (
                  <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-blue-100 text-blue-700">
                    <Crown className="w-3 h-3" />
                    owner
                  </span>
                );
              } else if (isEditor) {
                return (
                  <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-green-100 text-green-700">
                    <Edit className="w-3 h-3" />
                    editor
                  </span>
                );
              } else if (isViewer) {
                return (
                  <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-gray-100 text-gray-700">
                    <Eye className="w-3 h-3" />
                    viewer
                  </span>
                );
              }
              return null;
            })()}
            
            {/* Collaborator Avatars */}
            {collaborators?.hasCollaborators && (
              <CollaboratorAvatars 
                collaboratorInfo={collaborators} 
                maxVisible={2}
                size="sm"
              />
            )}
            
            {/* Sync Status */}
            <div className="flex items-center">
              {isRiverWalkSynced(riverWalk) ? (
                <div title="Synced">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
              ) : (
                <div title="Pending sync">
                  <Clock className="w-4 h-4 text-warning" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-0.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <InlineEdit
                value={riverWalk.date}
                onSave={(newValue) => onUpdateField(riverWalk.id, 'date', newValue)}
                type="date"
                className="text-muted-foreground hover:text-foreground"
                disabled={isArchived}
              />
            </div>
            
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <InlineEdit
                value={riverWalk.country}
                onSave={(newValue) => onUpdateField(riverWalk.id, 'country', newValue)}
                className="text-muted-foreground hover:text-foreground"
                placeholder="Country"
                disabled={isArchived}
              />
              {riverWalk.county && (
                <>
                  <span className="text-muted-foreground/50">,</span>
                  <InlineEdit
                    value={riverWalk.county}
                    onSave={(newValue) => onUpdateField(riverWalk.id, 'county', newValue)}
                    className="text-muted-foreground hover:text-foreground"
                    placeholder="County"
                    disabled={isArchived}
                  />
                </>
              )}
            </div>
          </div>
          
          {riverWalk.notes && (
            <div className="mt-1">
              <InlineEdit
                value={riverWalk.notes}
                onSave={(newValue) => onUpdateField(riverWalk.id, 'notes', newValue)}
                multiline
                className="text-muted-foreground hover:text-foreground"
                placeholder="Add notes..."
                disabled={isArchived}
              />
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1.5 flex-col sm:flex-row sm:flex-wrap">
        {isArchived ? (
          // Archived view: Restore and Delete buttons
          archiveLoading === riverWalk.id ? null : (
            <>
              <button
                onClick={() => onRestore(riverWalk.id)}
                className="bg-success/10 hover:bg-success/20 text-success px-2.5 py-1.5 rounded-lg font-medium transition-colors border border-success/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center text-sm"
              >
                {archiveLoading === riverWalk.id ? (
                  <>
                    <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-success/30 border-t-success"></div>
                    <span className="truncate">Restoring...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    <span className="truncate">Restore</span>
                  </>
                )}
              </button>
              <button
                onClick={() => onDelete(riverWalk.id)}
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-2.5 py-1.5 rounded-lg font-medium transition-colors border border-destructive/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center text-sm"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                <span className="truncate">Delete Forever</span>
              </button>
            </>
          )
        ) : (
          // Active view: Management buttons
          <>
            {canManageSites && (
              <button
                onClick={tutorialActive ? undefined : () => onManageSites(riverWalk)}
                disabled={tutorialActive}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors border border-slate-200 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                data-tutorial="manage-sites"
              >
                <MapPin className="w-4 h-4 mr-1" />
                <span className="truncate">Manage Sites</span>
              </button>
            )}

            <button
              onClick={tutorialActive ? undefined : () => onGeneratePrintTemplate(riverWalk)}
              disabled={templateLoading === riverWalk.id || tutorialActive || !isOnline()}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-medium transition-colors border border-slate-200 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              data-tutorial="print-template"
              title={!isOnline() ? "Print templates require an internet connection" : ""}
            >
              {templateLoading === riverWalk.id ? (
                <>
                  <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                  <span className="truncate">Generating...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-1" />
                  <span className="truncate">Print Template</span>
                </>
              )}
            </button>

            {canAccessReports(subscription) ? (
              <button
                onClick={tutorialActive ? undefined : () => onGenerateReport(riverWalk)}
                disabled={tutorialActive}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors border border-slate-200 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                data-tutorial="generate-report"
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                <span className="truncate">Generate Report</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (tutorialActive) return;
                  onUpgradePrompt('reports');
                }}
                disabled={tutorialActive}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors border border-slate-200 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                data-tutorial="generate-report"
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                <span className="truncate">Generate Report</span>
              </button>
            )}

            {canShare && canAccessAdvancedFeatures(subscription) && (
              <button
                onClick={tutorialActive ? undefined : () => onShare?.(riverWalk)}
                disabled={tutorialActive}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors border border-slate-200 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                data-tutorial="collaborate"
              >
                <Share className="w-4 h-4 mr-1" />
                <span className="truncate">Share</span>
              </button>
            )}

            {canArchive && (
              <button
                onClick={tutorialActive ? undefined : () => onArchive(riverWalk.id)}
                disabled={archiveLoading === riverWalk.id || tutorialActive}
                className="bg-warning/10 hover:bg-warning/20 text-warning px-2.5 py-1.5 rounded-lg font-medium transition-colors border border-warning/20 shadow-modern hover:shadow-modern-lg touch-manipulation flex-1 sm:flex-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                data-tutorial="archive"
              >
                {archiveLoading === riverWalk.id ? (
                  <>
                    <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-warning/30 border-t-warning"></div>
                    <span className="truncate">Archiving...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4 mr-1" />
                    <span className="truncate">Archive</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
    );
  };

  if (riverWalks.length === 0 && archivedRiverWalks.length === 0) {
    return (
      <div className="card-modern-xl p-8 text-center">
        <div className="w-16 h-16 rounded-xl gradient-muted flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No River Walks Yet</h3>
        <p className="text-muted-foreground">
          Create your first river study to get started with documentation and analysis.
        </p>
      </div>
    );
  }

  // Group river walks into categories for tab filtering
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

  // Get the river walks to display based on active tab
  const getFilteredRiverWalks = () => {
    switch (activeTab) {
      case 'my-walks':
        return myRiverWalks;
      case 'shared-with-me':
        return sharedWithMe;
      case 'shared-by-me':
        return sharedByMe;
      case 'archived':
        return archivedRiverWalks;
      case 'all':
      default:
        return riverWalks;
    }
  };

  const isShowingArchived = activeTab === 'archived';
  const displayedRiverWalks = getFilteredRiverWalks();

  return (
    <div className="space-y-3">
      {/* Tab Navigation */}
      <RiverWalkTabs
        riverWalks={riverWalks}
        archivedRiverWalks={archivedRiverWalks}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        getCollaboratorInfo={getCollaboratorInfo}
      />

      {/* River Walks List */}
      {displayedRiverWalks.length > 0 ? (
        <div className="space-y-2">
          {displayedRiverWalks.map((riverWalk, index) => renderRiverWalk(riverWalk, isShowingArchived, index))}
        </div>
      ) : (
        <div className="card-modern-xl p-6 text-center">
          <div className="w-12 h-12 rounded-xl gradient-muted flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {activeTab === 'all' && riverWalks.length === 0 
              ? 'No River Walks Yet' 
              : `No ${activeTab === 'my-walks' ? 'Personal' : activeTab === 'shared-with-me' ? 'Shared with Me' : activeTab === 'shared-by-me' ? 'Shared by Me' : 'Archived'} River Walks`
            }
          </h3>
          <p className="text-muted-foreground text-sm">
            {activeTab === 'all' && riverWalks.length === 0
              ? 'Create your first river study to get started with documentation and analysis.'
              : `You don't have any ${activeTab === 'my-walks' ? 'personal' : activeTab === 'shared-with-me' ? 'shared with you' : activeTab === 'shared-by-me' ? 'shared by you' : 'archived'} river walks yet.`
            }
          </p>
        </div>
      )}
    </div>
  );
}