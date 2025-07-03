import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { LogOut, MapPin, User as UserIcon, Users, UserCheck, Crown } from 'lucide-react';
import {
  RiverWalkForm,
  RiverWalkList,
  EnhancedSiteManagement,
} from '../components/river-walks';
import { ReportGenerator } from '../components/river-walks/ReportGenerator';
import { ShareModal } from '../components/river-walks/ShareModal';
import { useOfflineRiverWalks } from '../hooks/useOfflineData';
import { useCollaboration, useCollaborationFeatureFlag } from '../hooks/useCollaboration';
import { useToast } from '../components/ui/ToastProvider';
import { offlineDataService } from '../lib/offlineDataService';
// Force redeploy timestamp: 2025-07-03T04:21:00Z
import { SubscriptionBadge } from '../components/ui/SubscriptionBadge';
import { UpgradePrompt } from '../components/ui/UpgradePrompt';
import { useSubscription, canAccessAdvancedFeatures } from '../hooks/useSubscription';
import { TermsGate } from '../components/auth/TermsGate';
import type { RiverWalk, RiverWalkFormData, Site } from '../types';
import { getSitesForRiverWalk } from '../lib/api/sites';
import type { User } from '@supabase/supabase-js';

export default function RiverWalksPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { collaborationEnabled } = useCollaborationFeatureFlag();
  const { pendingInvites, acceptInvite } = useCollaboration();
  const subscription = useSubscription();
  
  const [user, setUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentRiverWalk, setCurrentRiverWalk] = useState<RiverWalk | null>(
    null
  );
  const [selectedRiverWalk, setSelectedRiverWalk] = useState<RiverWalk | null>(
    null
  );
  const [reportRiverWalk, setReportRiverWalk] = useState<RiverWalk | null>(null);
  const [reportSites, setReportSites] = useState<Site[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, right: number} | null>(null);
  const [archiveLoading, setArchiveLoading] = useState<string | null>(null);
  const [shareRiverWalk, setShareRiverWalk] = useState<RiverWalk | null>(null);
  const [showJoinCollaboration, setShowJoinCollaboration] = useState(false);
  const [joinCollabLink, setJoinCollabLink] = useState('');
  const [manageCollaboratorsRiverWalk, setManageCollaboratorsRiverWalk] = useState<RiverWalk | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<'reports' | 'export' | 'advanced' | null>(null);

  const {
    riverWalks,
    loading,
    error,
    createRiverWalk,
    updateRiverWalk,
    archiveRiverWalk,
    restoreRiverWalk,
    deleteRiverWalk,
    refetch,
    isRiverWalkSynced,
    realtimeStatus
  } = useOfflineRiverWalks();

  // TODO: Add archived river walks support to offline hooks
  // For now, filter archived from main list (they have archived: true)
  const activeRiverWalks = riverWalks.filter(rw => !rw.archived);
  const archivedRiverWalks = riverWalks.filter(rw => rw.archived);
  
  const setError = (errorMessage: string | null) => {
    // Handle error setting for now - we'll need to add this to the hook later
    console.error(errorMessage);
  };

  // Check if user is authenticated
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      setUser(session.user);

      // Check for pending invite token from OAuth flow
      const storedToken = localStorage.getItem('pending_invite_token');
      if (storedToken && collaborationEnabled && acceptInvite) {
        localStorage.removeItem('pending_invite_token');
        
        try {
          const result = await acceptInvite(storedToken);
          if (result.success) {
            showSuccess('Welcome to the Team!', 'You now have access to this river walk!');
            await refetch(); // Refresh the river walks list
          } else {
            showError('Invite Failed', result.message);
          }
        } catch (error) {
          console.error('Error processing stored invite token:', error);
          showError('Invite Failed', error instanceof Error ? error.message : 'Failed to accept invite');
        }
      }
    };

    checkUser();
  }, [router, collaborationEnabled, acceptInvite, showSuccess, showError, refetch]);

  // One-time sync queue cleanup (remove after deployment)
  useEffect(() => {
    const cleanupSyncQueue = async () => {
      try {
        const hasCleared = localStorage.getItem('riverwalks_sync_queue_cleared');
        if (!hasCleared) {
          await offlineDataService.clearSyncQueue();
          localStorage.setItem('riverwalks_sync_queue_cleared', 'true');
        }
      } catch (error) {
        console.error('Error during sync queue cleanup:', error);
      }
    };

    if (user) {
      cleanupSyncQueue();
    }
  }, [user]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showProfileDropdown && !target.closest('[data-profile-dropdown]')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  const handleFormSubmit = async (formData: RiverWalkFormData) => {
    try {
      if (currentRiverWalk) {
        await updateRiverWalk(currentRiverWalk.id, formData);
      } else {
        await createRiverWalk(formData);
      }

      // Reset form state
      setShowForm(false);
      setCurrentRiverWalk(null);
    } catch (error) {
      console.error('Failed to save river walk:', error);
      setError(error instanceof Error ? error.message : 'Failed to save river walk');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setCurrentRiverWalk(null);
  };

  const handleUpdateField = async (id: string, field: keyof RiverWalk, value: string) => {
    try {
      const updateData = { [field]: value };
      await updateRiverWalk(id, updateData);
    } catch (error) {
      console.error('Failed to update river walk field:', error);
      setError(error instanceof Error ? error.message : 'Failed to update river walk');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      setArchiveLoading(id);
      const riverWalk = activeRiverWalks.find(rw => rw.id === id);
      await archiveRiverWalk(id);
      showSuccess('River Walk Archived', `${riverWalk?.name || 'River walk'} has been archived.`);
    } catch (error) {
      console.error('Failed to archive river walk:', error);
      showError('Archive Failed', error instanceof Error ? error.message : 'Failed to archive river walk');
      setError(error instanceof Error ? error.message : 'Failed to archive river walk');
    } finally {
      setArchiveLoading(null);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      setArchiveLoading(id);
      const riverWalk = archivedRiverWalks.find(rw => rw.id === id);
      await restoreRiverWalk(id);
      showSuccess('River Walk Restored', `${riverWalk?.name || 'River walk'} has been restored.`);
    } catch (error) {
      console.error('Failed to restore river walk:', error);
      showError('Restore Failed', error instanceof Error ? error.message : 'Failed to restore river walk');
      setError(error instanceof Error ? error.message : 'Failed to restore river walk');
    } finally {
      setArchiveLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setArchiveLoading(id);
      const riverWalk = archivedRiverWalks.find(rw => rw.id === id);
      await deleteRiverWalk(id);
      showSuccess('River Walk Deleted', `${riverWalk?.name || 'River walk'} has been permanently deleted.`);
    } catch (error) {
      console.error('Failed to delete river walk:', error);
      showError('Delete Failed', error instanceof Error ? error.message : 'Failed to delete river walk');
    } finally {
      setArchiveLoading(null);
    }
  };

  const handleManageSites = (riverWalk: RiverWalk) => {
    setSelectedRiverWalk(riverWalk);
  };

  const handleCloseSiteManagement = () => {
    setSelectedRiverWalk(null);
  };

  const handleGenerateReport = async (riverWalk: RiverWalk) => {
    setLoadingReport(true);
    try {
      const sites = await getSitesForRiverWalk(riverWalk.id);
      setReportSites(sites);
      setReportRiverWalk(riverWalk);
    } catch (error) {
      console.error('Error loading sites for report:', error);
      setError('Failed to load sites for report. Please try again.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleCloseReport = () => {
    setReportRiverWalk(null);
    setReportSites([]);
  };

  const handleShare = (riverWalk: RiverWalk) => {
    setShareRiverWalk(riverWalk);
  };

  const handleCloseShare = () => {
    setShareRiverWalk(null);
  };

  const handleManageCollaborators = (riverWalk: RiverWalk) => {
    setManageCollaboratorsRiverWalk(riverWalk);
  };

  const handleCloseManageCollaborators = () => {
    setManageCollaboratorsRiverWalk(null);
  };

  const handleSignOut = async () => {
    // Clear offline cache before signing out
    offlineDataService.clearUserCache();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSwitchAccount = async () => {
    // Clear offline cache first
    offlineDataService.clearUserCache();
    // Sign out current user
    await supabase.auth.signOut();
    // Force account selection on next sign in
    setTimeout(() => {
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/river-walks`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'online'
          }
        }
      });
    }, 500); // Small delay to ensure sign out completes
  };

  const handleAddNewRiverWalk = () => {
    setShowForm(!showForm);
    setCurrentRiverWalk(null);
    // Close join collaboration if it's open
    if (showJoinCollaboration) {
      setShowJoinCollaboration(false);
      setJoinCollabLink('');
    }
  };

  const handleJoinCollaboration = () => {
    if (!joinCollabLink.trim()) {
      showError('Invalid Link', 'Please enter a valid collaboration link.');
      return;
    }

    // Extract token from the link
    const linkPattern = /\/invite\/([a-zA-Z0-9-_]+)/;
    const match = joinCollabLink.match(linkPattern);
    
    if (!match) {
      showError('Invalid Link', 'This doesn\'t appear to be a valid collaboration link.');
      return;
    }

    const token = match[1];
    
    // Navigate to the invite page with the token
    router.push(`/invite/${token}`);
  };

  // Loading state
  if (loading && !riverWalks.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 to-slate-100 flex items-center justify-center p-8">
        <div className="glass rounded-2xl p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Loading River Walks</h1>
          <p className="text-muted-foreground">Preparing your study data...</p>
        </div>
      </div>
    );
  }

  return (
    <TermsGate user={user!}>
      <div className="min-h-screen bg-gradient-to-br from-muted/50 to-slate-100">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Compact header with logo and profile */}
        <div className="glass rounded-2xl p-4 sm:p-6 mb-8 border border-white/20">
          <div className="flex items-center justify-between gap-4">
            {/* Left side: Logo and title */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <img 
                src="/logo.png" 
                alt="Riverwalks Logo" 
                className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl object-contain shadow-lg flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">River Walks</h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your River Work Documentation</p>
              </div>
            </div>

            {/* Center: Subscription Status */}
            <div className="hidden sm:block">
              <SubscriptionBadge subscription={subscription} userEmail={user?.email} />
            </div>

            {/* Right side: Navigation and Profile */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="relative flex-shrink-0" data-profile-dropdown>
                {/* Profile button */}
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPosition({
                      top: rect.bottom + 8,
                      right: window.innerWidth - rect.right
                    });
                    setShowProfileDropdown(!showProfileDropdown);
                  }}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg bg-white/50 hover:bg-white/80 transition-all duration-200 touch-manipulation border border-white/30"
                  title="Profile menu"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="hidden sm:block text-sm truncate max-w-32">{user.email}</span>
                </button>

                </div>
              )}
            </div>
          </div>
        </div>


        {/* Pending Invites Notification */}
        {collaborationEnabled && pendingInvites && pendingInvites.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  {pendingInvites.length} Pending Invite{pendingInvites.length > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  You have been invited to collaborate on river walk{pendingInvites.length > 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {pendingInvites.slice(0, 3).map((invite: any) => (
                    <div key={invite.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          River Walk Collaboration
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {invite.role} access • Expires {new Date(invite.invite_expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const result = await acceptInvite(invite.invite_token);
                            await refetch();
                            showSuccess('Invite Accepted', 'You now have access to this river walk!');
                          } catch (error) {
                            console.error('Failed to accept invite:', error);
                            showError('Accept Failed', error instanceof Error ? error.message : 'Failed to accept invite');
                          }
                        }}
                        className="ml-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Accept
                      </button>
                    </div>
                  ))}
                  {pendingInvites.length > 3 && (
                    <p className="text-xs text-blue-600 mt-2">
                      +{pendingInvites.length - 3} more invite{pendingInvites.length - 3 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-xl mb-8 flex items-center justify-between">
            <span className="font-medium">{error}</span>
            <button 
              className="text-destructive hover:text-destructive/80 text-xl font-bold"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* Action Buttons / Form */}
        <div className={`morph-container ${showForm || showJoinCollaboration ? 'morph-form-state' : 'morph-button-state'} mb-8`}>
          {/* Button State */}
          <div className={`add-button-morph ${showForm || showJoinCollaboration ? 'add-button-hidden' : 'add-button-visible'}`}>
            <div className="flex gap-4">
              <button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg touch-manipulation flex-1"
                onClick={handleAddNewRiverWalk}
              >
                + New River Walk
              </button>
              {collaborationEnabled && (
                canAccessAdvancedFeatures(subscription) ? (
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium transition-colors touch-manipulation"
                    onClick={() => {
                      setShowJoinCollaboration(true);
                      // Close add form if it's open
                      if (showForm) {
                        setShowForm(false);
                        setCurrentRiverWalk(null);
                      }
                    }}
                  >
                    Join a Walk
                  </button>
                ) : (
                  <button
                    className="bg-gradient-to-r from-blue-50 to-teal-50 hover:from-blue-100 hover:to-teal-100 text-blue-700 px-4 py-3 rounded-lg font-medium transition-all duration-200 border-2 border-blue-200 shadow-modern hover:shadow-modern-lg touch-manipulation relative"
                    onClick={() => setShowUpgradePrompt('advanced')}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Join a Walk
                    <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                      Pro
                    </div>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Form State */}
          {showForm && (
            <div className={`form-morph form-enter`}>
              <RiverWalkForm
                currentRiverWalk={currentRiverWalk}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                loading={loading}
              />
            </div>
          )}

          {/* Join Collaboration State */}
          {showJoinCollaboration && (
            <div className={`form-morph form-enter`}>
              <div className="glass rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Join a Walk</h2>
                  <button
                    onClick={() => {
                      setShowJoinCollaboration(false);
                      setJoinCollabLink('');
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Collaboration Link
                    </label>
                    <input
                      type="text"
                      value={joinCollabLink}
                      onChange={(e) => setJoinCollabLink(e.target.value)}
                      placeholder="Paste collaboration link here (e.g., https://riverwalks.co.uk/invite/...)"
                      className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleJoinCollaboration}
                      disabled={!joinCollabLink.trim()}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Join Walk
                    </button>
                    <button
                      onClick={() => {
                        setShowJoinCollaboration(false);
                        setJoinCollabLink('');
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-medium text-blue-900 mb-2">How it works:</p>
                    <ul className="text-blue-800 space-y-1">
                      <li>• Get a collaboration link from someone via email or message</li>
                      <li>• Paste the full link above (starts with https://riverwalks.co.uk/invite/)</li>
                      <li>• Click "Join Walk" to accept the invitation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* River walks list - hidden when form or join collaboration is showing */}
        {!showForm && !showJoinCollaboration && (
          <RiverWalkList
            riverWalks={activeRiverWalks}
            archivedRiverWalks={archivedRiverWalks}
            onUpdateField={handleUpdateField}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onDelete={handleDelete}
            onManageSites={handleManageSites}
            onGenerateReport={handleGenerateReport}
            onShare={collaborationEnabled ? handleShare : undefined}
            onManageCollaborators={collaborationEnabled ? handleManageCollaborators : undefined}
            isRiverWalkSynced={isRiverWalkSynced}
            archiveLoading={archiveLoading}
          />
        )}

        {/* Site management modal */}
        {selectedRiverWalk && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-2 sm:p-4 z-50"
            onClick={handleCloseSiteManagement}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <EnhancedSiteManagement
                riverWalk={selectedRiverWalk}
                onClose={handleCloseSiteManagement}
              />
            </div>
          </div>
        )}

        {/* Report generator modal */}
        {reportRiverWalk && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-2 sm:p-4 z-50"
            onClick={handleCloseReport}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <ReportGenerator
                riverWalk={reportRiverWalk}
                sites={reportSites}
                onClose={handleCloseReport}
              />
            </div>
          </div>
        )}

        {/* Share modal */}
        {shareRiverWalk && collaborationEnabled && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-2 sm:p-4 z-50"
            onClick={handleCloseShare}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <ShareModal
                riverWalk={shareRiverWalk}
                isOpen={true}
                onClose={handleCloseShare}
              />
            </div>
          </div>
        )}

        {/* Manage Collaborators modal */}
        {manageCollaboratorsRiverWalk && collaborationEnabled && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-2 sm:p-4 z-50"
            onClick={handleCloseManageCollaborators}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <ShareModal
                riverWalk={manageCollaboratorsRiverWalk}
                isOpen={true}
                onClose={handleCloseManageCollaborators}
              />
            </div>
          </div>
        )}

        {/* Loading indicator for report generation */}
        {loadingReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-auto text-center">
              <div className="mb-6">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <div className="flex space-x-1 justify-center">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-0"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Generating Report</h3>
              <p className="text-gray-600">Loading site data and preparing visualizations...</p>
            </div>
          </div>
        )}

        {/* Upgrade Prompt Modal */}
        {showUpgradePrompt && (
          <UpgradePrompt
            feature={showUpgradePrompt}
            onClose={() => setShowUpgradePrompt(null)}
          />
        )}
      </div>
      

      {/* Profile dropdown portal - renders at top level */}
      {showProfileDropdown && dropdownPosition && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed w-48 bg-white rounded-lg shadow-modern border border-white/30 py-2 z-[99999] animate-in slide-in-from-top-2 fade-in-0 duration-200"
          style={{
            top: dropdownPosition.top,
            right: dropdownPosition.right,
          }}
          data-profile-dropdown
        >
          <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
            Signed in as
          </div>
          <div className="px-4 py-2 text-sm font-medium text-foreground border-b border-border">
            {user?.email}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowProfileDropdown(false);
              handleSwitchAccount();
            }}
            className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            Switch Account
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowProfileDropdown(false);
              handleSignOut();
            }}
            className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>,
        document.body
      )}
      </div>
    </TermsGate>
  );
}
