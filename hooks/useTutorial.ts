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
  markStepComplete: (stepId: string) => void;
  canStartTutorial: boolean;
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
    id: 'demo-form',
    title: 'Let\'s Create a Demo River Walk',
    content: 'We\'ll create a practice river walk together. First, enter a name for your river walk study.',
    targetSelector: 'center',
    position: 'center',
    actionRequired: true,
    tip: 'This is just for practice - you can delete it later.'
  },
  {
    id: 'demo-save',
    title: 'Save Your River Walk',
    content: 'Perfect! We\'ve filled in some example data for you. Now click "Save River Walk" to complete your first study.',
    targetSelector: 'center',
    position: 'center',
    actionRequired: true,
    tip: 'Once saved, you can add measurement sites and collect field data.'
  },
  {
    id: 'tutorial-complete',
    title: 'Tutorial Complete!',
    content: 'Great! You\'ve created your first river walk. You can now add measurement sites, collect data, and export reports. Feel free to explore all the features!',
    targetSelector: 'center',
    position: 'center',
    tip: 'Happy studying! If you need help, use the feedback option in your profile menu to get support.'
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

  const exitTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tutorial complete
      exitTutorial();
      updateTutorialState({ hasSeenTutorial: true });
    }
  }, [currentStep, exitTutorial, updateTutorialState]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(async () => {
    setIsActive(false);
    setCurrentStep(0);
    await updateTutorialState({ hasSeenTutorial: true });
  }, [updateTutorialState]);

  const markStepComplete = useCallback((stepId: string) => {
    const newCompletedSteps = [...tutorialState.completedSteps];
    if (!newCompletedSteps.includes(stepId)) {
      newCompletedSteps.push(stepId);
      updateTutorialState({ completedSteps: newCompletedSteps });
    }
  }, [tutorialState.completedSteps]);

  return {
    isActive,
    currentStep,
    steps: TUTORIAL_STEPS,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    exitTutorial,
    markStepComplete,
    canStartTutorial,
    demoFormData,
    setDemoFormData
  };
}