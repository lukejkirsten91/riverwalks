import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  skipable?: boolean;
  actionRequired?: boolean;
  tip?: string;
}

interface TutorialState {
  hasSeenTutorial: boolean;
  completedSteps: string[];
  lastUpdated: string;
}

interface UseTutorialReturn {
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
  demoFormData: {
    name: string;
    date: string;
    county: string;
    country: string;
  };
  setDemoFormData: (data: { name: string; date: string; county: string; country: string }) => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to River Walks!',
    content: 'Let\'s take a quick tour to help you get started with creating and managing your river walk studies. This tutorial will guide you through the essential features.',
    targetSelector: 'center',
    position: 'center',
    skipable: true,
    tip: 'You can access this tutorial anytime from your profile menu.'
  },
  {
    id: 'new-river-walk',
    title: 'Create Your First River Walk',
    content: 'Click this button to start creating a new river walk study. This is where all your data collection begins!',
    targetSelector: '[data-tutorial="new-river-walk"]',
    position: 'bottom',
    actionRequired: true,
    tip: 'A river walk is a complete study session where you\'ll collect data from multiple sites along a river.'
  },
  {
    id: 'print-template',
    title: 'Print Template',
    content: 'This button generates a PDF template that you can print and take into the field for recording measurements by hand.',
    targetSelector: '[data-tutorial="export-template"]',
    position: 'top',
    skipable: true,
    tip: 'Perfect for when you need paper backups or want to record data offline.'
  },
  {
    id: 'export',
    title: 'Export Data',
    content: 'Export your river walk data to Excel format for further analysis or sharing with teachers.',
    targetSelector: '[data-tutorial="export"]',
    position: 'top',
    skipable: true,
    tip: 'Premium feature - requires a subscription for full access.'
  },
  {
    id: 'collaborate',
    title: 'Collaborate',
    content: 'Share your river walk with classmates or teachers to work together on data collection.',
    targetSelector: '[data-tutorial="collaborate"]',
    position: 'top',
    skipable: true,
    tip: 'Premium feature - ideal for group projects and teacher supervision.'
  },
  {
    id: 'archive',
    title: 'Archive',
    content: 'Archive completed river walks to keep your workspace organized while preserving your data.',
    targetSelector: '[data-tutorial="archive"]',
    position: 'top',
    skipable: true,
    tip: 'Archived river walks can be restored anytime from the archived section.'
  },
  {
    id: 'profile-menu',
    title: 'Access Tutorial Anytime',
    content: 'You can restart this tutorial anytime by clicking your profile menu here and selecting "Tutorial". Feel free to explore the features on your own!',
    targetSelector: '[data-profile-dropdown] > button',
    position: 'bottom',
    skipable: true,
    tip: 'The profile menu also contains account settings, feedback options, and sign out.'
  }
];

const DEFAULT_TUTORIAL_STATE: TutorialState = {
  hasSeenTutorial: false,
  completedSteps: [],
  lastUpdated: new Date().toISOString()
};

export function useTutorial(): UseTutorialReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialState, setTutorialState] = useState<TutorialState>(DEFAULT_TUTORIAL_STATE);
  const [canStartTutorial, setCanStartTutorial] = useState(false);
  const [hasExitedThisSession, setHasExitedThisSession] = useState(false);
  const [demoFormData, setDemoFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    county: 'Devon',
    country: 'UK'
  });

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

      // Load from user metadata
      const userTutorial = user.user_metadata?.tutorial;
      if (userTutorial) {
        setTutorialState({ ...DEFAULT_TUTORIAL_STATE, ...userTutorial });
      } else {
        setTutorialState(DEFAULT_TUTORIAL_STATE);
      }
    } catch (error) {
      console.error('Error loading tutorial state:', error);
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
  }, []);

  const exitTutorial = useCallback(async () => {
    // Show profile menu step before fully exiting
    setCurrentStep(TUTORIAL_STEPS.length - 1); // Go to profile-menu step
    setHasExitedThisSession(true);
    await updateTutorialState({ hasSeenTutorial: true });
  }, [updateTutorialState]);

  const nextStep = useCallback(async () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tutorial complete
      setIsActive(false);
      setCurrentStep(0);
      await updateTutorialState({ hasSeenTutorial: true });
    }
  }, [currentStep, updateTutorialState]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(async () => {
    // Show profile menu step before fully exiting
    setCurrentStep(TUTORIAL_STEPS.length - 1); // Go to profile-menu step
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
    steps: TUTORIAL_STEPS,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    exitTutorial,
    fullyExitTutorial,
    markStepComplete,
    canStartTutorial,
    hasExitedThisSession,
    demoFormData,
    setDemoFormData
  };
}