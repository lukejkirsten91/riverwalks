import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { LogOut, MapPin, User as UserIcon, Users, UserCheck, Crown, Settings, MessageCircle, Lightbulb } from 'lucide-react';
import {
  RiverWalkList,
} from '../components/river-walks';
import { useOfflineRiverWalks } from '../hooks/useOfflineData';
import { useCollaboration, useCollaborationFeatureFlag } from '../hooks/useCollaboration';
import { useToast } from '../components/ui/ToastProvider';
import { offlineDataService } from '../lib/offlineDataService';
// Force redeploy timestamp: 2025-07-03T04:21:00Z
import { SubscriptionBadge } from '../components/ui/SubscriptionBadge';
import { useSubscription, canAccessAdvancedFeatures } from '../hooks/useSubscription';
import { TermsGate } from '../components/auth/TermsGate';
import { WelcomeFlow } from '../components/onboarding/WelcomeFlow';
import { TutorialOverlay } from '../components/onboarding/TutorialOverlay';
import { useOnboarding } from '../hooks/useOnboarding';
import { useTutorial } from '../hooks/useTutorial';
import { resetModalStyles } from '../lib/utils/modal';
import type { RiverWalk, RiverWalkFormData } from '../types';
import type { User } from '@supabase/supabase-js';
import { useScrollLock } from '../hooks/useScrollLock';

export default function RiverWalksPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { collaborationEnabled } = useCollaborationFeatureFlag();
  const { pendingInvites, acceptInvite } = useCollaboration();
  const subscription = useSubscription();
  const { shouldShowWelcome, shouldShowTutorial, markWelcomeComplete, markFirstRiverWalkCreated } = useOnboarding();
  const {
    isActive: tutorialActive,
    currentStep: tutorialStep,
    steps: tutorialSteps,
    startTutorial,
    nextStep: nextTutorialStep,
    previousStep: previousTutorialStep,
    skipTutorial,
    exitTutorial,
    fullyExitTutorial,
    markStepComplete,
    canStartTutorial,
    hasExitedThisSession,
    demoFormData,
    setDemoFormData
  } = useTutorial();
  
  const [user, setUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, right: number} | null>(null);
  const [archiveLoading, setArchiveLoading] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState<string | null>(null);
  const [showJoinCollaboration, setShowJoinCollaboration] = useState(false);
  const [joinCollabLink, setJoinCollabLink] = useState('');
  const [showTutorialCompletionModal, setShowTutorialCompletionModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Apply scroll lock when any modal is open
  useScrollLock(!!showForm || !!showJoinCollaboration || !!shouldShowWelcome || tutorialActive || showTutorialCompletionModal);

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

      // Check for tutorial completion from query parameter
      if (router.query.tutorialComplete === 'true') {
        // Clean up the query parameter
        router.replace('/river-walks', undefined, { shallow: true });
        // Continue tutorial with premium features instead of showing completion modal
        if (tutorialActive) {
          // Tutorial is still active, advance to the created-river-walk step
          setTimeout(() => {
            nextTutorialStep();
          }, 500);
        } else {
          // Tutorial was not active, show completion modal
          setShowTutorialCompletionModal(true);
        }
      }

      // Auto-start tutorial for new users after welcome (only if they haven't seen it)
      if (shouldShowTutorial && canStartTutorial && !tutorialActive && !hasExitedThisSession) {
        // Additional check: only start if tutorial hasn't been seen
        const userTutorial = user?.user_metadata?.tutorial;
        if (!userTutorial?.hasSeenTutorial) {
          setTimeout(() => startTutorial(), 1000); // Small delay to let page load
        }
      }
    };

    checkUser();
    
    // Reset any modal styles that might be blocking interactions
    resetModalStyles();
  }, [router, collaborationEnabled, acceptInvite, showSuccess, showError, refetch, shouldShowTutorial, canStartTutorial, tutorialActive, hasExitedThisSession, startTutorial]);

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
    // If tutorial is active, prevent navigation
    if (tutorialActive) {
      return; // Don't navigate during tutorial
    }
    router.push(`/river-walks/${riverWalk.id}/sites`);
  };

  const handleGenerateReport = async (riverWalk: RiverWalk) => {
    // If tutorial is active, prevent navigation
    if (tutorialActive) {
      return; // Don't navigate during tutorial
    }
    router.push(`/river-walks/${riverWalk.id}/report`);
  };

  const handleGeneratePrintTemplate = async (riverWalk: RiverWalk) => {
    // Show modal to ask for number of sites
    const siteCount = prompt('How many sites will you be measuring? (Enter a number between 1 and 20)', '5');
    
    if (!siteCount || isNaN(parseInt(siteCount))) {
      return;
    }

    const numSites = parseInt(siteCount);
    if (numSites < 1 || numSites > 20) {
      showError('Invalid Site Count', 'Please enter a number between 1 and 20');
      return;
    }

    setTemplateLoading(riverWalk.id);

    try {
      const fileName = `${riverWalk.name.replace(/[^a-z0-9\s]/gi, '_').replace(/\s+/g, '_')}_template.pdf`;
      
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      
      const response = await fetch('/api/generate-print-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          riverWalkId: riverWalk.id,
          siteCount: numSites,
          fileName: fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate print template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccess('Print Template Generated', 'Your print template has been downloaded successfully!');
    } catch (error) {
      console.error('Error generating print template:', error);
      showError('Generation Failed', 'Failed to generate print template. Please try again.');
    } finally {
      setTemplateLoading(null);
    }
  };

  const handleShare = (riverWalk: RiverWalk) => {
    router.push(`/river-walks/${riverWalk.id}/share`);
  };

  const handleManageCollaborators = (riverWalk: RiverWalk) => {
    router.push(`/river-walks/${riverWalk.id}/share`);
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
          redirectTo: 'https://www.riverwalks.co.uk/api/auth/callback?redirect_to=' + encodeURIComponent('/river-walks'),
          queryParams: {
            prompt: 'select_account',
            access_type: 'online'
          }
        }
      });
    }, 500); // Small delay to ensure sign out completes
  };

  const handleAddNewRiverWalk = async () => {
    // If tutorial is active and we're on the new-river-walk step, navigate to form and continue tutorial
    if (tutorialActive && tutorialSteps[tutorialStep]?.id === 'new-river-walk') {
      // Navigate to the actual form
      router.push('/river-walks/new?tutorial=true');
      // Continue to next step (print-template step)
      setTimeout(() => {
        nextTutorialStep();
      }, 500);
      return;
    }
    
    if (tutorialActive) {
      return; // Don't navigate during any other tutorial step
    }
    
    router.push('/river-walks/new');
  };

  const handleTutorialNext = async () => {
    // Default behavior - advance to next step
    nextTutorialStep();
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
      <div className="min-h-screen gradient-muted flex items-center justify-center p-8">
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
      <div className="min-h-screen gradient-muted">
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
                data-tutorial="new-river-walk"
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
                                        }
                    }}
                  >
                    Join a Walk
                  </button>
                ) : (
                  <button
                    className="bg-gradient-to-r from-blue-50 to-teal-50 hover:from-blue-100 hover:to-teal-100 text-blue-700 px-4 py-3 rounded-lg font-medium transition-all duration-200 border-2 border-blue-200 shadow-modern hover:shadow-modern-lg touch-manipulation relative"
                    onClick={() => router.push('/upgrade?feature=advanced')}
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
            onGeneratePrintTemplate={handleGeneratePrintTemplate}
            onShare={collaborationEnabled ? handleShare : undefined}
            onManageCollaborators={collaborationEnabled ? handleManageCollaborators : undefined}
            onUpgradePrompt={(feature) => router.push(`/upgrade?feature=${feature}`)}
            isRiverWalkSynced={isRiverWalkSynced}
            archiveLoading={archiveLoading}
            templateLoading={templateLoading}
            tutorialActive={tutorialActive}
          />
        )}

        {/* Welcome Flow Modal */}
        {shouldShowWelcome && user && (
          <WelcomeFlow
            onComplete={markWelcomeComplete}
            userEmail={user.email}
          />
        )}

        {/* Tutorial Overlay */}
        {tutorialActive && !showTutorialCompletionModal && (
          <TutorialOverlay
            steps={tutorialSteps}
            currentStep={tutorialStep}
            onNext={handleTutorialNext}
            onPrevious={previousTutorialStep}
            onSkip={skipTutorial}
            onExit={exitTutorial}
            onFullyExit={fullyExitTutorial}
            onStepComplete={markStepComplete}
            isVisible={tutorialActive}
            demoFormData={demoFormData}
            onDemoFormChange={setDemoFormData}
          />
        )}

        {/* Tutorial Completion Modal */}
        {showTutorialCompletionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10001] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-500">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Well Done! 🎉
                </h2>
                <p className="text-gray-600 mb-6">
                  You've successfully completed the tutorial and created your first river walk! 
                  You can now add measurement sites, collect data, and explore all the other features.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowTutorialCompletionModal(false);
                      // Continue from print-template step (step 2)
                      startTutorial();
                      // Skip directly to print-template step
                      setTimeout(() => {
                        nextTutorialStep(); // Go to step 1 (new-river-walk)
                        setTimeout(() => {
                          nextTutorialStep(); // Go to step 2 (print-template)
                        }, 50);
                      }, 100);
                    }}
                    className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    Continue Tutorial
                  </button>
                  <button
                    onClick={() => {
                      setShowTutorialCompletionModal(false);
                      exitTutorial();
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    Start Exploring
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      

      {/* Profile dropdown portal - renders at top level */}
      {showProfileDropdown && dropdownPosition && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed w-64 sm:w-48 bg-white rounded-lg shadow-modern border border-white/30 py-2 z-[99999] animate-in slide-in-from-top-2 fade-in-0 duration-200"
          style={{
            top: dropdownPosition.top,
            right: dropdownPosition.right,
          }}
          data-profile-dropdown
        >
          <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
            Signed in as
          </div>
          <div className="px-4 py-2 text-sm font-medium text-foreground border-b border-border break-words">
            <div className="truncate max-w-[224px] sm:max-w-[160px]" title={user?.email}>
              {user?.email}
            </div>
          </div>
          {/* Admin button - only visible to luke.kirsten@gmail.com */}
          {user?.email === 'luke.kirsten@gmail.com' && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowProfileDropdown(false);
                router.push('/admin');
              }}
              className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] flex items-center gap-2 border-b border-border"
            >
              <Settings className="w-4 h-4" />
              Admin Dashboard
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowProfileDropdown(false);
              router.push('/account');
            }}
            className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Account Settings
          </button>
          {canStartTutorial && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowProfileDropdown(false);
                startTutorial();
              }}
              className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              Tutorial
            </button>
          )}
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
              router.push('/feedback');
            }}
            className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] flex items-center gap-2 border-b border-border"
          >
            <MessageCircle className="w-4 h-4" />
            Send Feedback
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
