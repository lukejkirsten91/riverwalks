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

  const loadOnboardingState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Try to load from user metadata first (fastest)
      const userOnboarding = user.user_metadata?.onboarding;
      if (userOnboarding) {
        setOnboardingState({ ...DEFAULT_ONBOARDING_STATE, ...userOnboarding });
        setLoading(false);
        return;
      }

      // Fallback: Check if user has any river walks (indicates they've used the app)
      const { data: riverWalks, error } = await supabase
        .from('river_walks')
        .select('id, created_at')
        .eq('user_id', user?.id)
        .limit(1);

      if (!error && riverWalks && riverWalks.length > 0) {
        // User has river walks, they've been onboarded
        const state: OnboardingState = {
          hasSeenWelcome: true,
          hasCreatedFirstRiverWalk: true,
          hasAddedFirstSite: false, // We'll check this separately if needed
          hasGeneratedFirstReport: false, // This requires premium
          lastUpdated: new Date().toISOString()
        };
        
        setOnboardingState(state);
        // Save to user metadata for faster future loads
        await updateUserMetadata(state);
      } else {
        // New user, show onboarding
        setOnboardingState(DEFAULT_ONBOARDING_STATE);
      }

    } catch (error) {
      console.error('Error loading onboarding state:', error);
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

  // Should show welcome if user hasn't seen it and doesn't have any river walks
  const shouldShowWelcome = !loading && !onboardingState.hasSeenWelcome;
  
  // Should show tutorial after welcome is complete but no first river walk created
  const shouldShowTutorial = !loading && onboardingState.hasSeenWelcome && !onboardingState.hasCreatedFirstRiverWalk;

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