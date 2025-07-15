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
        
        // If in tutorial mode, advance tutorial instead of normal navigation
        if (isTutorialMode && tutorialActive) {
          // Navigate back to river-walks with tutorial active
          router.push('/river-walks?tutorial=complete');
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
    // If in tutorial mode, exit tutorial
    if (isTutorialMode && tutorialActive) {
      exitTutorial();
    }
    router.push('/river-walks');
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
      
      {/* Tutorial Overlay for Form Steps */}
      {isTutorialMode && formTutorialActive && (
        <TutorialOverlay
          steps={[
            {
              id: 'form-name',
              title: 'Fill in Your River Walk Details',
              content: 'Start by entering a descriptive name for your river walk study. This will help you identify it later when you have multiple studies.',
              targetSelector: '[data-tutorial="river-walk-name"]',
              position: 'bottom',
              tip: 'The name field is highlighted and waiting for your input.',
              actionRequired: true
            }
          ]}
          currentStep={0}
          onNext={() => {/* Form tutorial navigation will be handled differently */}}
          onPrevious={() => {}}
          onSkip={skipTutorial}
          onExit={exitTutorial}
          isVisible={true}
        />
      )}
    </div>
  );
}