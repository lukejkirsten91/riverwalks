import React, { useState } from 'react';
import { MapPin, BookOpen, BarChart3, Users, CheckCircle, ArrowRight, Crown } from 'lucide-react';
import Link from 'next/link';
import { trackUserAction } from '../../hooks/usePerformanceMonitoring';
import { useScrollLock } from '../../hooks/useScrollLock';

interface WelcomeFlowProps {
  onComplete: () => void;
  userEmail?: string;
}

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

export function WelcomeFlow({ onComplete, userEmail }: WelcomeFlowProps) {
  useScrollLock(true); // Always lock scroll when welcome flow is open
  
  const [currentStep, setCurrentStep] = useState(0);

  const steps: Step[] = [
    {
      id: 'welcome',
      title: 'Welcome to Riverwalks!',
      description: 'Your professional tool for GCSE Geography fieldwork',
      icon: MapPin,
      content: (
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Welcome to Riverwalks!</h2>
          <p className="text-gray-600 mb-4 text-sm">
            You've joined thousands of GCSE Geography students using Riverwalks to create 
            professional river study documentation and reports.
          </p>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Signed in as:</strong> {userEmail}
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: 'What you can do',
      description: 'Discover the features that make fieldwork easier',
      icon: BookOpen,
      content: (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Free Features</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">River Walk Creation</h4>
                <p className="text-sm text-gray-600">Create unlimited river walks with site management</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Data Collection</h4>
                <p className="text-sm text-gray-600">Record measurements, photos, and field notes</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Offline Support</h4>
                <p className="text-sm text-gray-600">Works offline in the field, syncs when online</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200">
            <div className="flex items-center mb-2">
              <Crown className="w-4 h-4 text-blue-600 mr-2" />
              <h4 className="font-semibold text-blue-900 text-sm">Premium Features</h4>
            </div>
            <div className="space-y-1 text-sm text-blue-800">
              <div>• Premium PDF reports with charts and analysis</div>
              <div>• Advanced data export options (Excel format)</div>
              <div>• River walk sharing and collaboration</div>
            </div>
            <div className="mt-2 text-sm text-blue-600">
              Starting at just £1.99/year (less than 40p per month!)
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Create your first river walk',
      icon: BarChart3,
      content: (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Your First River Walk</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Create a River Walk</h4>
                <p className="text-sm text-gray-600">Give your study a name, date, and location</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Add Study Sites</h4>
                <p className="text-sm text-gray-600">Mark locations along your river where you'll take measurements</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Collect Data</h4>
                <p className="text-sm text-gray-600">Record measurements, photos, and observations at each site</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-full flex items-center justify-center mr-3">
                <Crown className="w-3 h-3" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Generate Report</h4>
                <p className="text-sm text-gray-600">Create professional PDF reports for your coursework</p>
                <span className="text-sm text-blue-600 bg-blue-100 px-2 py-0.5 rounded mt-1 inline-block">Premium Feature</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      trackUserAction('onboarding_step_completed', { 
        step: steps[currentStep].id,
        stepNumber: currentStep + 1 
      });
    } else {
      trackUserAction('onboarding_completed', { 
        totalSteps: steps.length,
        userEmail: userEmail 
      });
      onComplete();
    }
  };

  const skipOnboarding = () => {
    trackUserAction('onboarding_skipped', { 
      atStep: currentStep + 1,
      stepId: steps[currentStep].id 
    });
    onComplete();
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-lg w-full mx-auto shadow-2xl my-4 max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-t-xl flex-shrink-0">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-tl-xl transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{currentStepData.title}</h3>
                <p className="text-sm sm:text-base text-gray-500">{currentStepData.description}</p>
              </div>
            </div>
            <span className="text-xs sm:text-sm text-gray-400 ml-2 flex-shrink-0">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {currentStepData.content}
        </div>

        {/* Actions */}
        <div className="p-4 sm:p-6 border-t border-gray-100 flex justify-between items-center flex-shrink-0">
          <button
            onClick={skipOnboarding}
            className="text-gray-600 hover:text-gray-800 font-medium transition-colors text-sm"
          >
            Skip for now
          </button>
          
          <div className="flex gap-3">
            {currentStep === steps.length - 1 ? (
              <button
                onClick={nextStep}
                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 text-sm"
              >
                Get Started
                <CheckCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 text-sm"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}