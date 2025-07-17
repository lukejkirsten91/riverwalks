import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { RiverWalkForm } from '../../components/river-walks';
import { useOfflineRiverWalks } from '../../hooks/useOfflineData';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useToast } from '../../components/ui/ToastProvider';
import { TutorialOverlay } from '../../components/onboarding/TutorialOverlay';
import { useTutorial } from '../../hooks/useTutorial';
import type { RiverWalkFormData } from '../../types';
import type { User } from '@supabase/supabase-js';

export default function NewRiverWalkPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { markFirstRiverWalkCreated } = useOnboarding();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTutorialMode, setIsTutorialMode] = useState(false);
  const [formTutorialActive, setFormTutorialActive] = useState(false);

  const { createRiverWalk } = useOfflineRiverWalks();
  
  const {
    isActive: tutorialActive,
    currentStep: tutorialStep,
    steps: tutorialSteps,
    nextStep: nextTutorialStep,
    previousStep: previousTutorialStep,
    skipTutorial,
    exitTutorial,
    fullyExitTutorial,
    markStepComplete,
  } = useTutorial();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }

      setUser(session.user);
      
      // Check if we're in tutorial mode
      const isTutorial = router.query.tutorial === 'true';
      setIsTutorialMode(isTutorial);
      setFormTutorialActive(isTutorial);
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (formData: RiverWalkFormData) => {
    if (!user) return;

    try {
      setLoading(true);
      
      const newRiverWalk = await createRiverWalk({
        ...formData,
        user_id: user.id,
      });

      if (newRiverWalk) {
        showSuccess('River Walk Created', 'Your new river walk has been created successfully!');
        markFirstRiverWalkCreated();
        
        // If in tutorial mode, navigate back with completion flag
        if (isTutorialMode) {
          router.push('/river-walks?tutorialComplete=true');
        } else {
          router.push('/river-walks');
        }
      }
    } catch (error) {
      console.error('Error creating river walk:', error);
      showError('Creation Failed', error instanceof Error ? error.message : 'Failed to create river walk');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // If in tutorial mode, fully exit tutorial and cancel walk creation
    if (isTutorialMode && tutorialActive) {
      fullyExitTutorial();
    }
    router.push('/river-walks');
  };

  const handleFormTutorialExit = () => {
    // Cancel river walk creation and go to tutorial end
    if (isTutorialMode) {
      // Navigate back and show final tutorial step
      router.push('/river-walks');
      // Set tutorial to final step after navigation
      setTimeout(() => {
        exitTutorial(); // This goes to the profile-menu step
      }, 100);
    } else {
      handleCancel();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="w-full sm:w-auto sm:max-w-4xl sm:rounded-lg overflow-hidden">
        <RiverWalkForm
          currentRiverWalk={null}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
          isTutorialMode={isTutorialMode}
          onFormInteraction={() => setFormTutorialActive(false)}
        />
      </div>
      
      {/* Simple Tutorial Message for Form */}
      {isTutorialMode && formTutorialActive && (
        <div className="fixed top-4 sm:top-44 left-1/2 transform -translate-x-1/2 z-[9999] px-4 w-full max-w-md">
          <div className="bg-blue-600 text-white rounded-lg shadow-lg px-4 py-3 flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Fill in Your River Walk Details</h3>
              <p className="text-blue-100 text-xs leading-relaxed">
                Complete all the form fields to create your first river walk study. When you're done, click "Create River Walk" to save it.
              </p>
            </div>
            <button
              onClick={handleFormTutorialExit}
              className="text-blue-200 hover:text-white transition-colors p-1 flex-shrink-0"
              aria-label="Close tutorial"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}