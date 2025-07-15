import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'intro.js/introjs.css';

// Dynamically import Steps to avoid SSR issues
const Steps = dynamic(() => import('intro.js-react').then(mod => mod.Steps), {
  ssr: false
});

interface IntroJsTutorialProps {
  enabled: boolean;
  steps: any[];
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
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        border: 1px solid #e5e7eb;
      }
      
      .introjs-tooltiptext {
        padding: 20px;
      }
      
      .introjs-button {
        border-radius: 8px;
        padding: 8px 16px;
        font-weight: 500;
        transition: all 0.2s;
      }
      
      .introjs-nextbutton {
        background: #3b82f6;
        border: none;
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
        border: none;
        color: #6b7280;
        text-decoration: underline;
      }
      
      .introjs-skipbutton:hover {
        color: #374151;
      }
      
      .introjs-bullets {
        display: none;
      }
      
      .introjs-progress {
        background: #e5e7eb;
        border-radius: 10px;
      }
      
      .introjs-progressbar {
        background: #3b82f6;
        border-radius: 10px;
      }
      
      .introjs-helperNumberLayer {
        background: #3b82f6;
        border: 2px solid white;
        color: white;
        font-weight: 600;
        width: 24px;
        height: 24px;
        line-height: 20px;
        font-size: 12px;
      }
      
      .introjs-overlay {
        background: rgba(0, 0, 0, 0.4);
      }
      
      .introjs-helperLayer {
        border-radius: 8px;
        border: 2px solid #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      @media (max-width: 768px) {
        .introjs-tooltip {
          max-width: calc(100vw - 32px);
          margin: 16px;
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
          padding: 16px;
        }
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const options = {
    showStepNumbers: true,
    showBullets: false,
    showProgress: true,
    skipLabel: 'Skip Tour',
    nextLabel: 'Next →',
    prevLabel: '← Back',
    doneLabel: 'Finish Tour',
    exitOnOverlayClick: false,
    exitOnEsc: true,
    scrollToElement: true,
    scrollPadding: 30,
    disableInteraction: false,
    tooltipPosition: 'auto',
    overlayOpacity: 0.4,
    autoPosition: true,
    positionPrecedence: ['bottom', 'top', 'right', 'left']
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
      onAfterChange={onAfterChange}
    />
  );
}