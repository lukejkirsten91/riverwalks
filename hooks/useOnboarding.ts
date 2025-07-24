import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface OnboardingState {
  hasSeenWelcome: boolean;
  hasCreatedFirstRiverWalk: boolean;
  hasAddedFirstSite: boolean;
  hasGeneratedFirstReport: boolean;
  lastUpdated: string;
}

interface OnboardingStatus {
  shouldShowWelcome: boolean;
  shouldShowTutorial: boolean;
  onboardingProgress: OnboardingState;
  loading: boolean;
  markWelcomeComplete: () => Promise<void>;
  markFirstRiverWalkCreated: () => Promise<void>;
  markFirstSiteAdded: () => Promise<void>;
  markFirstReportGenerated: () => Promise<void>;
}

const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  hasSeenWelcome: false,
  hasCreatedFirstRiverWalk: false,
  hasAddedFirstSite: false,
  hasGeneratedFirstReport: false,
  lastUpdated: new Date().toISOString()
};

export function useOnboarding(): OnboardingStatus {
  const [loading, setLoading] = useState(true);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);

  useEffect(() => {
    loadOnboardingState();
  }, []);

  // Monitor online/offline state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      // When coming back online, clear the offline mode flag if it was set by navigation
      if (sessionStorage.getItem('riverwalks_offline_mode') === 'true') {
        console.log('Back online - clearing offline mode flag');
        sessionStorage.removeItem('riverwalks_offline_mode');
      }
    };

    const handleOffline = () => {
      // When going offline, set the offline mode flag to prevent onboarding
      sessionStorage.setItem('riverwalks_offline_mode', 'true');
      console.log('Gone offline - set offline mode flag');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOnboardingState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user has any river walks first (most reliable indicator)
      const { data: riverWalks, error } = await supabase
        .from('river_walks')
        .select('id, created_at')
        .eq('user_id', user?.id)
        .limit(1);

      if (!error && riverWalks && riverWalks.length > 0) {
        // User has river walks - they're an existing user, mark as fully onboarded
        const state: OnboardingState = {
          hasSeenWelcome: true,
          hasCreatedFirstRiverWalk: true,
          hasAddedFirstSite: true, // Assume existing users have used the app
          hasGeneratedFirstReport: true, // Assume existing users have used the app
          lastUpdated: new Date().toISOString()
        };
        
        setOnboardingState(state);
        // Always update metadata for existing users to prevent future issues
        await updateUserMetadata(state);
        setLoading(false);
        return;
      }

      // If no river walks, try to load from user metadata  
      const userOnboarding = user.user_metadata?.onboarding;
      if (userOnboarding) {
        setOnboardingState({ ...DEFAULT_ONBOARDING_STATE, ...userOnboarding });
      } else {
        // New user with no metadata and no river walks
        setOnboardingState(DEFAULT_ONBOARDING_STATE);
      }

    } catch (error) {
      console.error('Error loading onboarding state:', error);
      // On error, assume existing user to prevent tutorial spam
      const state: OnboardingState = {
        hasSeenWelcome: true,
        hasCreatedFirstRiverWalk: true,
        hasAddedFirstSite: true,
        hasGeneratedFirstReport: true,
        lastUpdated: new Date().toISOString()
      };
      setOnboardingState(state);
    } finally {
      setLoading(false);
    }
  };

  const updateUserMetadata = async (newState: Partial<OnboardingState>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedState = { 
        ...onboardingState, 
        ...newState, 
        lastUpdated: new Date().toISOString() 
      };

      // Update local state
      setOnboardingState(updatedState);

      // Update user metadata (this persists across sessions)
      await supabase.auth.updateUser({
        data: {
          onboarding: updatedState
        }
      });

      console.log('✅ Onboarding state updated:', updatedState);
    } catch (error) {
      console.error('❌ Error updating onboarding state:', error);
    }
  };

  const markWelcomeComplete = async () => {
    await updateUserMetadata({ hasSeenWelcome: true });
  };

  const markFirstRiverWalkCreated = async () => {
    await updateUserMetadata({ hasCreatedFirstRiverWalk: true });
  };

  const markFirstSiteAdded = async () => {
    await updateUserMetadata({ hasAddedFirstSite: true });
  };

  const markFirstReportGenerated = async () => {
    await updateUserMetadata({ hasGeneratedFirstReport: true });
  };

  // Check if we're in offline mode (prevents onboarding on offline page or fallback pages)
  const isOfflineMode = typeof window !== 'undefined' && (
    sessionStorage.getItem('riverwalks_offline_mode') === 'true' ||
    !navigator.onLine
  );

  // Should show welcome only if user is genuinely new AND we're sure they have no river walks
  // Be conservative - only show welcome for truly new users to prevent welcome spam
  // Never show onboarding when in offline mode
  const shouldShowWelcome = !loading && 
    !isOfflineMode &&
    !onboardingState.hasSeenWelcome && 
    !onboardingState.hasCreatedFirstRiverWalk && 
    !onboardingState.hasAddedFirstSite && 
    !onboardingState.hasGeneratedFirstReport;
  
  // Should show tutorial after welcome is complete but no first river walk created
  // Also be conservative here to prevent tutorial spam
  // Never show tutorial when in offline mode
  const shouldShowTutorial = !loading && 
    !isOfflineMode &&
    onboardingState.hasSeenWelcome && 
    !onboardingState.hasCreatedFirstRiverWalk &&
    !onboardingState.hasAddedFirstSite;

  return {
    shouldShowWelcome,
    shouldShowTutorial,
    onboardingProgress: onboardingState,
    loading,
    markWelcomeComplete,
    markFirstRiverWalkCreated,
    markFirstSiteAdded,
    markFirstReportGenerated
  };
}

// Helper function to check if user is new (can be used in other components)
export function isNewUser(onboardingState: OnboardingState): boolean {
  return !onboardingState.hasSeenWelcome && !onboardingState.hasCreatedFirstRiverWalk;
}

// Helper function to get onboarding progress percentage
export function getOnboardingProgress(onboardingState: OnboardingState): number {
  const steps = [
    onboardingState.hasSeenWelcome,
    onboardingState.hasCreatedFirstRiverWalk,
    onboardingState.hasAddedFirstSite,
    onboardingState.hasGeneratedFirstReport
  ];
  
  const completed = steps.filter(Boolean).length;
  return Math.round((completed / steps.length) * 100);
}