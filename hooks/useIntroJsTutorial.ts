import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface TutorialStep {
  id: string;
  element: string;
  intro: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  tooltipClass?: string;
  highlightClass?: string;
  actionRequired?: boolean;
  skipable?: boolean;
}

interface TutorialState {
  hasSeenTutorial: boolean;
  completedSteps: string[];
  lastUpdated: string;
}

interface UseIntroJsTutorialReturn {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  exitTutorial: () => void;
  fullyExitTutorial: () => void;
  markStepComplete: (stepId: string) => void;
  canStartTutorial: boolean;
  hasExitedThisSession: boolean;
  tutorialRef: React.RefObject<any>;
}

// Convert our tutorial steps to Intro.js format
const INTRO_JS_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    element: 'body',
    intro: `
      <div class="tutorial-welcome">
        <h2>Welcome to River Walks!</h2>
        <p>Now that you've created your first river walk, let's take a quick tour of the key features you can use to manage your field studies.</p>
        <small class="tutorial-tip">💡 You can access this tutorial anytime from your profile menu.</small>
      </div>
    `,
    position: 'auto',
    skipable: true
  },
  {
    id: 'created-river-walk',
    element: '[data-tutorial="created-river-walk"]',
    intro: `
      <div class="tutorial-step">
        <h3>Your River Walk</h3>
        <p>Here you can see all the details and actions available for your study.</p>
      </div>
    `,
    position: 'bottom',
    skipable: true
  },
  {
    id: 'manage-sites',
    element: '[data-tutorial="manage-sites"]',
    intro: `
      <div class="tutorial-step">
        <h3>Sites & Measurements</h3>
        <p>Click this button to create measurement locations along your river where you'll collect field data. This is your next step!</p>
        <small class="tutorial-tip">💡 Sites are specific locations along your river where you'll take measurements like river width, depth, velocity, and sediment size.</small>
      </div>
    `,
    position: 'top',
    skipable: true
  },
  {
    id: 'print-template',
    element: '[data-tutorial="print-template"]',
    intro: `
      <div class="tutorial-step">
        <h3>Print Template</h3>
        <p>This button generates a PDF template that you can print and take into the field for recording measurements by hand.</p>
        <small class="tutorial-tip">💡 Perfect for when you need paper backups or want to record data offline.</small>
      </div>
    `,
    position: 'top',
    skipable: true
  },
  {
    id: 'export',
    element: '[data-tutorial="generate-report"]',
    intro: `
      <div class="tutorial-step">
        <h3>Export Data</h3>
        <p>Export your river walk data to Excel format for analysis. Basic accounts get Excel export, while premium accounts get detailed PDF reports with charts and analysis.</p>
        <small class="tutorial-tip">💡 Basic: Excel export included. Premium: Advanced PDF reports with charts.</small>
      </div>
    `,
    position: 'top',
    skipable: true
  },
  {
    id: 'collaborate',
    element: '[data-tutorial="collaborate"]',
    intro: `
      <div class="tutorial-step">
        <h3>Collaborate</h3>
        <p>Share your river walk with classmates or teachers to work together on data collection.</p>
        <small class="tutorial-tip">💡 Premium feature - ideal for group projects and teacher supervision.</small>
      </div>
    `,
    position: 'top',
    skipable: true
  },
  {
    id: 'archive',
    element: '[data-tutorial="archive"]',
    intro: `
      <div class="tutorial-step">
        <h3>Archive</h3>
        <p>Archive completed river walks to keep your workspace organized while preserving your data.</p>
        <small class="tutorial-tip">💡 Archived river walks can be restored anytime from the archived section.</small>
      </div>
    `,
    position: 'top',
    skipable: true
  },
  {
    id: 'profile-menu',
    element: '[data-profile-dropdown] > button',
    intro: `
      <div class="tutorial-step">
        <h3>Access Tutorial Anytime</h3>
        <p>You can restart this tutorial anytime by clicking your profile menu here and selecting "Tutorial". Feel free to explore the features on your own!</p>
        <small class="tutorial-tip">💡 The profile menu also contains account settings, feedback options, and sign out.</small>
      </div>
    `,
    position: 'bottom',
    skipable: true
  }
];

const DEFAULT_TUTORIAL_STATE: TutorialState = {
  hasSeenTutorial: false,
  completedSteps: [],
  lastUpdated: new Date().toISOString()
};

export function useIntroJsTutorial(): UseIntroJsTutorialReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialState, setTutorialState] = useState<TutorialState>(DEFAULT_TUTORIAL_STATE);
  const [canStartTutorial, setCanStartTutorial] = useState(false);
  const [hasExitedThisSession, setHasExitedThisSession] = useState(false);
  const [tutorialRef] = useState({ current: null });

  useEffect(() => {
    loadTutorialState();
  }, []);

  const loadTutorialState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setCanStartTutorial(false);
        return;
      }

      setCanStartTutorial(true);

      // Check if user has existing river walks - if so, mark tutorial as seen
      const { data: riverWalks, error } = await supabase
        .from('river_walks')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);

      if (!error && riverWalks && riverWalks.length > 0) {
        // User has river walks - they're an existing user, mark tutorial as seen
        const state: TutorialState = {
          hasSeenTutorial: true,
          completedSteps: [],
          lastUpdated: new Date().toISOString()
        };
        setTutorialState(state);
        // Update metadata to prevent future issues
        await updateTutorialState(state);
        return;
      }

      // Load from user metadata for new users
      const userTutorial = user.user_metadata?.tutorial;
      if (userTutorial) {
        setTutorialState({ ...DEFAULT_TUTORIAL_STATE, ...userTutorial });
      } else {
        setTutorialState(DEFAULT_TUTORIAL_STATE);
      }
    } catch (error) {
      console.error('Error loading tutorial state:', error);
      // On error, assume existing user and mark tutorial as seen
      setTutorialState({ ...DEFAULT_TUTORIAL_STATE, hasSeenTutorial: true });
      setCanStartTutorial(false);
    }
  };

  const updateTutorialState = async (newState: Partial<TutorialState>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedState = { 
        ...tutorialState, 
        ...newState, 
        lastUpdated: new Date().toISOString() 
      };

      setTutorialState(updatedState);

      // Update user metadata
      await supabase.auth.updateUser({
        data: {
          tutorial: updatedState
        }
      });

      console.log('✅ Tutorial state updated:', updatedState);
    } catch (error) {
      console.error('❌ Error updating tutorial state:', error);
    }
  };

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
    setHasExitedThisSession(false);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < INTRO_JS_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tutorial complete
      setIsActive(false);
      setCurrentStep(0);
      updateTutorialState({ hasSeenTutorial: true });
    }
  }, [currentStep, updateTutorialState]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(async () => {
    setIsActive(false);
    setCurrentStep(0);
    setHasExitedThisSession(true);
    await updateTutorialState({ hasSeenTutorial: true });
  }, [updateTutorialState]);

  const exitTutorial = useCallback(async () => {
    // Show profile menu step before fully exiting
    setCurrentStep(INTRO_JS_STEPS.length - 1);
    setHasExitedThisSession(true);
    await updateTutorialState({ hasSeenTutorial: true });
  }, [updateTutorialState]);

  const fullyExitTutorial = useCallback(async () => {
    setIsActive(false);
    setCurrentStep(0);
    setHasExitedThisSession(true);
    await updateTutorialState({ hasSeenTutorial: true });
  }, [updateTutorialState]);

  const markStepComplete = useCallback((stepId: string) => {
    const newCompletedSteps = [...tutorialState.completedSteps];
    if (!newCompletedSteps.includes(stepId)) {
      newCompletedSteps.push(stepId);
      updateTutorialState({ completedSteps: newCompletedSteps });
    }
  }, [tutorialState.completedSteps, updateTutorialState]);

  return {
    isActive,
    currentStep,
    steps: INTRO_JS_STEPS,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    exitTutorial,
    fullyExitTutorial,
    markStepComplete,
    canStartTutorial,
    hasExitedThisSession,
    tutorialRef
  };
}