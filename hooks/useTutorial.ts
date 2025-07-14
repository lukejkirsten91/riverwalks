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
    id: 'export-template',
    title: 'Export Print Template (Optional)',
    content: 'Before heading to the field, you can export a print template for offline data collection. This is useful if you expect poor signal coverage.',
    targetSelector: '[data-tutorial="export-template"]',
    position: 'top',
    tip: 'Load this page with good signal, then switch to airplane mode - it works offline! But a printed backup is always wise.'
  },
  {
    id: 'manage-sites',
    title: 'Manage Sites and Info',
    content: 'Now let\'s add your first site. Sites are specific locations along the river where you\'ll collect measurements.',
    targetSelector: '[data-tutorial="manage-sites"]',
    position: 'bottom',
    actionRequired: true
  },
  {
    id: 'export-options',
    title: 'Export Your Data',
    content: 'Once you\'ve collected data, you can export it in various formats. Excel export is available for all users.',
    targetSelector: '[data-tutorial="export"]',
    position: 'bottom',
    tip: 'Export data for analysis in Excel, or upgrade for professional PDF reports.'
  },
  {
    id: 'premium-features',
    title: 'Premium Features Available',
    content: 'With a premium subscription, you can export PDF reports, collaborate with team members, and access advanced features.',
    targetSelector: '[data-tutorial="upgrade"]',
    position: 'bottom',
    tip: 'Premium features include PDF reports, team collaboration, unlimited storage, and priority support.'
  },
  {
    id: 'archive-restore',
    title: 'Archive and Restore',
    content: 'You can archive completed river walks to keep your workspace organized, and restore them later if needed.',
    targetSelector: '[data-tutorial="archive"]',
    position: 'top',
    tip: 'Archiving helps organize your studies without losing data. You can always restore archived walks later.'
  },
  {
    id: 'profile-menu',
    title: 'Profile Menu',
    content: 'Access your profile menu to manage account settings, upgrade your subscription, or restart this tutorial anytime.',
    targetSelector: '[data-profile-dropdown]',
    position: 'bottom',
    tip: 'Your profile menu also includes account settings, feedback options, and help resources.'
  },
  {
    id: 'tutorial-complete',
    title: 'Tutorial Complete!',
    content: 'Congratulations! You\'ve completed the River Walks tutorial. You\'re now ready to create professional river studies. Remember, you can access this tutorial anytime from your profile menu.',
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
    canStartTutorial
  };
}