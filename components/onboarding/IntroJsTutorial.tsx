import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'intro.js/introjs.css';

// Dynamically import Steps to avoid SSR issues
const Steps = dynamic(() => import('intro.js-react').then(mod => mod.Steps), {
  ssr: false
});

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

interface IntroJsTutorialProps {
  enabled: boolean;
  steps: TutorialStep[];
  initialStep?: number;
  onExit: () => void;
  onComplete: () => void;
  onBeforeChange?: (nextStepIndex: number) => void;
  onChange?: (currentStepIndex: number) => void;
  onAfterChange?: (currentStepIndex: number) => void;
}

export function IntroJsTutorial({
  enabled,
  steps,
  initialStep = 0,
  onExit,
  onComplete,
  onBeforeChange,
  onChange,
  onAfterChange
}: IntroJsTutorialProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    // Add custom CSS for our tutorial styling (client-side only)
    if (typeof window === 'undefined') return;
    
    const style = document.createElement('style');
    style.textContent = `
      .tutorial-welcome h2, .tutorial-step h3 {
        margin: 0 0 12px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }
      
      .tutorial-welcome p, .tutorial-step p {
        margin: 0 0 12px 0;
        font-size: 14px;
        line-height: 1.5;
        color: #374151;
      }
      
      .tutorial-tip {
        display: block;
        font-size: 12px;
        color: #6b7280;
        background: #f3f4f6;
        padding: 8px 12px;
        border-radius: 6px;
        margin-top: 8px;
        border-left: 3px solid #3b82f6;
      }
      
      .introjs-tooltip {
        max-width: 400px;
        min-width: 300px;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        border: 1px solid #e5e7eb;
        background: white;
        padding: 12px 16px 0;
      }
      
      .introjs-tooltiptext {
        padding-bottom: 16px;
        min-height: 60px;
      }
      
      .introjs-tooltipbuttons {
        text-align: right;
        border-top: 1px solid #e5e7eb;
        padding: 16px 16px;
        background: #f9fafb;
        border-radius: 0 0 12px 12px;
        margin-left: -16px;
        margin-right: -16px;
        box-sizing: border-box;
      }
      
      .introjs-button {
        border-radius: 8px;
        padding: 8px 16px;
        font-weight: 500;
        transition: all 0.2s;
        margin-left: 8px;
        border: none;
        cursor: pointer;
        font-size: 14px;
      }
      
      .introjs-nextbutton {
        background: #3b82f6;
        color: white;
      }
      
      .introjs-nextbutton:hover {
        background: #2563eb;
      }
      
      .introjs-prevbutton {
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        color: #374151;
      }
      
      .introjs-prevbutton:hover {
        background: #e5e7eb;
      }
      
      .introjs-skipbutton {
        background: transparent;
        color: #6b7280;
        text-decoration: none;
        border: none;
        padding: 0;
        margin: 0;
        position: absolute;
        right: 12px;
        top: 12px;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
        text-indent: 0;
      }
      
      .introjs-skipbutton:hover {
        background: #f3f4f6;
        color: #374151;
      }
      
      .introjs-bullets {
        display: none;
      }
      
      .introjs-progress {
        background: #e5e7eb;
        border-radius: 6px;
        margin-bottom: 16px;
        height: 6px;
        overflow: hidden;
      }
      
      .introjs-progressbar {
        background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
        border-radius: 6px;
        height: 6px;
        transition: width 0.4s ease;
      }
      
      .introjs-helperNumberLayer {
        background: #3b82f6;
        border: 2px solid white;
        color: white;
        font-weight: 700;
        min-width: 24px;
        height: 24px;
        padding: 0 6px;
        line-height: 1;
        font-size: 11px;
        border-radius: 12px;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 10000;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
      
      .introjs-overlay {
        background: rgba(0, 0, 0, 0.5);
      }
      
      .introjs-helperLayer {
        border-radius: 8px;
        border: 3px solid #3b82f6;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        pointer-events: auto !important;
      }
      
      /* Enable clicking on highlighted elements during tutorial */
      .introjs-showElement {
        pointer-events: auto !important;
        cursor: pointer !important;
      }
      
      .introjs-showElement * {
        pointer-events: auto !important;
      }
      
      /* Hide next button for actionRequired steps */
      .introjs-tooltip[data-action-required="true"] .introjs-nextbutton {
        display: none !important;
      }
      
      @media (max-width: 768px) {
        .introjs-tooltip {
          max-width: calc(100vw - 32px);
          min-width: 280px;
          margin: 16px;
          border-radius: 8px;
          padding: 12px 14px 0;
        }
        
        .tutorial-welcome h2, .tutorial-step h3 {
          font-size: 16px;
        }
        
        .tutorial-welcome p, .tutorial-step p {
          font-size: 13px;
        }
        
        .tutorial-tip {
          font-size: 11px;
        }
        
        .introjs-tooltiptext {
          padding-bottom: 12px;
        }
        
        .introjs-tooltipbuttons {
          padding: 12px 14px;
          margin-left: -14px;
          margin-right: -14px;
          box-sizing: border-box;
        }
        
        .introjs-button {
          padding: 6px 12px;
          font-size: 13px;
        }
        
        .introjs-skipbutton {
          right: 12px;
          top: 12px;
        }
        
        .introjs-helperNumberLayer {
          min-width: 20px;
          height: 20px;
          font-size: 10px;
          padding: 0 4px;
        }
        
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const options = {
    showStepNumbers: false, // Hide step numbers for cleaner look
    showBullets: false,
    showProgress: true, // Show progress bar
    skipLabel: '✕',
    nextLabel: 'Next →',
    prevLabel: '← Back',
    doneLabel: 'Finish Tour',
    exitOnOverlayClick: false,
    exitOnEsc: true,
    scrollToElement: true,
    scrollPadding: 50,
    disableInteraction: false, // Allow interaction with highlighted elements
    tooltipPosition: 'auto',
    overlayOpacity: 0.5,
    autoPosition: true,
    positionPrecedence: ['bottom', 'top', 'right', 'left'],
    tooltipClass: 'custom-introjs-tooltip',
    helperElementPadding: 10,
    highlightClass: 'introjs-custom-highlight'
  };

  // Add data attribute for actionRequired steps and scroll to popup
  const handleAfterChange = (stepIndex: number) => {
    setCurrentStepIndex(stepIndex);
    
    if (typeof window !== 'undefined') {
      const currentStep = steps[stepIndex];
      
      // For the 'Access Tutorial Anytime' step, scroll to page top, otherwise scroll to popup
      setTimeout(() => {
        if (currentStep && currentStep.id === 'profile-menu') {
          // For the final step, scroll to page top
          window.scrollTo({ 
            top: 0, 
            behavior: 'smooth' 
          });
        } else {
          // For all other steps, scroll to popup
          const tooltip = document.querySelector('.introjs-tooltip');
          if (tooltip) {
            tooltip.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
          }
        }
      }, 100);
      
      const tooltip = document.querySelector('.introjs-tooltip');
      
      if (tooltip && currentStep) {
        if (currentStep.actionRequired) {
          tooltip.setAttribute('data-action-required', 'true');
        } else {
          tooltip.removeAttribute('data-action-required');
        }
        
      }
    }
    
    if (onAfterChange) {
      onAfterChange(stepIndex);
    }
  };

  if (!enabled || !isMounted) {
    return null;
  }

  return (
    <Steps
      enabled={enabled}
      steps={steps}
      initialStep={initialStep}
      options={options}
      onExit={onExit}
      onComplete={onComplete}
      onBeforeChange={onBeforeChange}
      onChange={onChange}
      onAfterChange={handleAfterChange}
    />
  );
}