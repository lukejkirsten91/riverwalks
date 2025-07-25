import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';

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

interface TutorialOverlayProps {
  steps: TutorialStep[];
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onExit: () => void;
  onFullyExit?: () => void;
  onStepComplete?: (stepId: string) => void;
  isVisible: boolean;
  demoFormData?: {
    name: string;
    date: string;
    county: string;
    country: string;
  };
  onDemoFormChange?: (data: { name: string; date: string; county: string; country: string }) => void;
}

interface SpotlightProps {
  targetElement: Element | null;
  overlayRef: React.RefObject<HTMLDivElement | null>;
}

const Spotlight: React.FC<SpotlightProps> = ({ targetElement, overlayRef }) => {
  const [overlayElements, setOverlayElements] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    if (!targetElement) {
      // No target element, show full overlay
      setOverlayElements([
        <div key="full-overlay" className="fixed inset-0 bg-black/50 z-[10000] pointer-events-none" />
      ]);
      return;
    }

    const updateSpotlight = () => {
      const rect = targetElement.getBoundingClientRect();
      const padding = 12;
      
      console.log('Spotlight target element:', targetElement);
      console.log('Element rect:', rect);
      console.log('Window dimensions:', window.innerWidth, 'x', window.innerHeight);
      
      // Create multiple overlay divs that cover everything except the highlighted area
      const elements = [
        // Top overlay
        <div
          key="top-overlay"
          className="fixed bg-black/50 z-[10000] pointer-events-auto transition-all duration-300 ease-out"
          style={{
            top: 0,
            left: 0,
            right: 0,
            height: `${Math.max(0, rect.top - padding)}px`,
          }}
        />,
        // Bottom overlay
        <div
          key="bottom-overlay"
          className="fixed bg-black/50 z-[10000] pointer-events-auto transition-all duration-300 ease-out"
          style={{
            top: `${Math.min(window.innerHeight, rect.bottom + padding)}px`,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />,
        // Left overlay
        <div
          key="left-overlay"
          className="fixed bg-black/50 z-[10000] pointer-events-auto transition-all duration-300 ease-out"
          style={{
            top: `${Math.max(0, rect.top - padding)}px`,
            left: 0,
            width: `${Math.max(0, rect.left - padding)}px`,
            height: `${Math.min(window.innerHeight, rect.bottom + padding) - Math.max(0, rect.top - padding)}px`,
          }}
        />,
        // Right overlay
        <div
          key="right-overlay"
          className="fixed bg-black/50 z-[10000] pointer-events-auto transition-all duration-300 ease-out"
          style={{
            top: `${Math.max(0, rect.top - padding)}px`,
            left: `${Math.min(window.innerWidth, rect.right + padding)}px`,
            right: 0,
            height: `${Math.min(window.innerHeight, rect.bottom + padding) - Math.max(0, rect.top - padding)}px`,
          }}
        />,
        // Highlight ring around target element
        <div
          key="highlight-ring"
          className="fixed border-2 border-blue-400 rounded-lg z-[9999] pointer-events-none animate-pulse"
          style={{
            top: `${rect.top - padding}px`,
            left: `${rect.left - padding}px`,
            width: `${rect.width + padding * 2}px`,
            height: `${rect.height + padding * 2}px`,
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
            animation: 'tutorial-glow 2s ease-in-out infinite',
          }}
        />,
      ].filter(element => {
        // Only include overlays with positive dimensions
        const style = element.props.style;
        if (style.height && parseFloat(style.height) <= 0) return false;
        if (style.width && parseFloat(style.width) <= 0) return false;
        return true;
      });

      setOverlayElements(elements);
    };

    updateSpotlight();
    
    const resizeObserver = new ResizeObserver(updateSpotlight);
    resizeObserver.observe(targetElement);
    window.addEventListener('scroll', updateSpotlight);
    window.addEventListener('resize', updateSpotlight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateSpotlight);
      window.removeEventListener('resize', updateSpotlight);
    };
  }, [targetElement]);

  return <>{overlayElements}</>;
};

const TutorialTooltip: React.FC<{
  step: TutorialStep;
  targetElement: Element | null;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onExit: () => void;
  onFullyExit?: () => void;
  currentStep: number;
  totalSteps: number;
  demoFormData?: {
    name: string;
    date: string;
    county: string;
    country: string;
  };
  onDemoFormChange?: (data: { name: string; date: string; county: string; country: string }) => void;
}> = ({ step, targetElement, onNext, onPrevious, onSkip, onExit, onFullyExit, currentStep, totalSteps, demoFormData, onDemoFormChange }) => {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!tooltipRef.current) return;

    const updateTooltipPosition = () => {
      const tooltipRect = tooltipRef.current!.getBoundingClientRect();
      const padding = isMobile ? 8 : 16;
      
      let top = 0;
      let left = 0;

      if (isMobile) {
        // On mobile, always center the tooltip horizontally to prevent any overflow issues
        const safeAreaTop = padding + 20; // Account for notch/status bar
        const safeAreaBottom = padding + 80; // Account for mobile bottom bar/home indicator
        const availableHeight = window.innerHeight - safeAreaTop - safeAreaBottom;
        const safeWidth = window.innerWidth - (padding * 2);
        const tooltipWidth = Math.min(safeWidth, 350); // Conservative max width
        
        if (!targetElement) {
          // Center for steps without target
          top = safeAreaTop + (availableHeight - tooltipRect.height) / 2;
        } else {
          const targetRect = targetElement.getBoundingClientRect();
          const availableSpaceAbove = targetRect.top - safeAreaTop;
          const availableSpaceBelow = window.innerHeight - targetRect.bottom - safeAreaBottom;
          
          // Try to position tooltip above target if there's enough space
          if (availableSpaceAbove >= tooltipRect.height + padding) {
            top = targetRect.top - tooltipRect.height - padding;
          }
          // Try to position tooltip below target if there's enough space
          else if (availableSpaceBelow >= tooltipRect.height + padding) {
            top = targetRect.bottom + padding;
          }
          // If target is in bottom 2/3 of screen, position at top
          else if (targetRect.top > window.innerHeight * 0.33) {
            top = safeAreaTop;
          }
          // Otherwise position at bottom
          else {
            top = window.innerHeight - tooltipRect.height - safeAreaBottom;
          }
        }
        
        // Always center horizontally on mobile to avoid any edge issues
        left = (window.innerWidth - tooltipWidth) / 2;
        
        // Ensure tooltip never goes off-screen with strict bounds
        const finalTop = Math.max(safeAreaTop, Math.min(top, window.innerHeight - tooltipRect.height - safeAreaBottom));
        const finalLeft = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
        
        setTooltipStyle({
          position: 'fixed',
          top: `${finalTop}px`,
          left: `${finalLeft}px`,
          zIndex: 10002,
          width: `${tooltipWidth}px`,
          maxWidth: 'none', // Override any inherited max-width
        });
        return;
      }

      // Desktop positioning logic
      if (!targetElement) {
        // Center for steps without target
        top = window.innerHeight / 2 - tooltipRect.height / 2;
        left = window.innerWidth / 2 - tooltipRect.width / 2;
      } else {
        const targetRect = targetElement.getBoundingClientRect();
        
        switch (step.position) {
          case 'top':
            top = targetRect.top - tooltipRect.height - padding;
            left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
            break;
          case 'bottom':
            top = targetRect.bottom + padding;
            left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
            break;
          case 'left':
            top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
            left = targetRect.left - tooltipRect.width - padding;
            break;
          case 'right':
            top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
            left = targetRect.right + padding;
            break;
          case 'center':
          default:
            top = window.innerHeight / 2 - tooltipRect.height / 2;
            left = window.innerWidth / 2 - tooltipRect.width / 2;
            break;
        }
      }

      // Keep tooltip within viewport
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

      setTooltipStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 10002,
      });
    };

    // Initial positioning with small delay
    const timer = setTimeout(updateTooltipPosition, 100);
    
    window.addEventListener('scroll', updateTooltipPosition);
    window.addEventListener('resize', updateTooltipPosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', updateTooltipPosition);
      window.removeEventListener('resize', updateTooltipPosition);
    };
  }, [targetElement, step.position, isMobile]);

  const tooltipClasses = isMobile 
    ? "bg-white rounded-lg shadow-2xl border border-gray-200 p-3 animate-in slide-in-from-bottom-4 fade-in-0 duration-500 ease-out"
    : "max-w-sm bg-white rounded-xl shadow-xl border border-gray-200 p-6 animate-in fade-in-0 zoom-in-95 duration-500 ease-out transform";

  return (
    <div
      key={`tutorial-tooltip-${step.id}`}
      ref={tooltipRef}
      style={tooltipStyle}
      className={tooltipClasses}
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'mb-2' : 'mb-4'}`}>
        <div className="flex items-center gap-2">
          <div className={`${isMobile ? 'w-5 h-5' : 'w-8 h-8'} bg-blue-100 rounded-full flex items-center justify-center`}>
            <Lightbulb className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-blue-600`} />
          </div>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500`}>
            {step.id === 'form-fill' && totalSteps === 1 ? 'Step 2.1 of 9' : `Step ${currentStep + 1} of ${totalSteps}`}
          </span>
        </div>
        <button
          onClick={step.id === 'profile-menu' && onFullyExit ? onFullyExit : onExit}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
        >
          <X className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </button>
      </div>

      {/* Progress bar */}
      <div className={`w-full bg-gray-200 rounded-full ${isMobile ? 'h-1 mb-2' : 'h-2 mb-4'}`}>
        <div
          className="bg-blue-600 rounded-full transition-all duration-300"
          style={{ 
            width: `${((currentStep + 1) / totalSteps) * 100}%`,
            height: '100%'
          }}
        />
      </div>

      {/* Content */}
      <div className={`${isMobile ? 'mb-3' : 'mb-6'}`}>
        <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-gray-900 ${isMobile ? 'mb-1' : 'mb-2'}`}>
          {step.title}
        </h3>
        <p className={`text-gray-600 leading-relaxed ${isMobile ? 'text-xs' : ''}`}>
          {step.content}
        </p>
        
        {/* Demo Form for demo-form step */}
        {step.id === 'demo-form' && demoFormData && onDemoFormChange && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                River Walk Name *
              </label>
              <input
                type="text"
                value={demoFormData.name}
                onChange={(e) => onDemoFormChange({
                  ...demoFormData,
                  name: e.target.value
                })}
                placeholder="e.g., River Thames Study"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>
        )}
        
        {/* Demo Form for demo-save step */}
        {step.id === 'demo-save' && demoFormData && (
          <div className="mt-4 space-y-3 bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Here's your river walk data:</div>
            <div className="space-y-2 text-sm">
              <div><strong>Name:</strong> {demoFormData.name || 'Demo River Walk'}</div>
              <div><strong>Date:</strong> {demoFormData.date}</div>
              <div><strong>Location:</strong> {demoFormData.county}, {demoFormData.country}</div>
            </div>
            <div className="text-xs text-blue-600 mt-2">
              ✓ We've pre-filled some example location data for you
            </div>
          </div>
        )}
        
        {step.tip && (
          <div className={`${isMobile ? 'mt-2 p-2' : 'mt-4 p-3'} bg-blue-50 border border-blue-200 rounded-lg`}>
            <div className="flex items-start gap-2">
              <Lightbulb className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-blue-600 mt-0.5 flex-shrink-0`} />
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-800`}>{step.tip}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'}`}>
        {!isMobile && (
          <div className="flex gap-2">
            {currentStep > 2 && (
              <button
                onClick={onPrevious}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
        )}

        <div className={`flex ${isMobile ? 'w-full' : 'items-center'} gap-2`}>
          <div className={`flex gap-2 ${isMobile ? 'flex-1' : ''}`}>
            {isMobile && currentStep > 2 && (
              <button
                onClick={onPrevious}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors bg-gray-100 rounded-lg flex-1"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}
            
            {/* Only show Next button for steps that aren't action-required */}
            {step.id !== 'new-river-walk' && step.id !== 'form-fill' && (
              <button
                onClick={step.id === 'profile-menu' && onFullyExit ? onFullyExit : onNext}
                disabled={step.id === 'demo-form' && (!demoFormData?.name || demoFormData.name.trim() === '')}
                className={`bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 ${isMobile ? 'py-2 text-xs' : 'py-2'} rounded-lg font-medium transition-colors flex items-center justify-center gap-1 ${isMobile ? 'flex-1' : ''}`}
              >
                {step.id === 'demo-save' ? 'Save River Walk' : 
                 step.id === 'profile-menu' ? 'Got It' :
                 ['print-template', 'export', 'collaborate', 'archive'].includes(step.id) ? 'Next' :
                 currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
                {currentStep < totalSteps - 1 && step.id !== 'demo-save' && step.id !== 'profile-menu' && <ChevronRight className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onSkip,
  onExit,
  onFullyExit,
  onStepComplete,
  isVisible,
  demoFormData,
  onDemoFormChange,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (!isVisible || !currentStepData) {
      setIsReady(false);
      setTargetElement(null);
      setRetryCount(0);
      setIsTransitioning(false);
      return;
    }

    const findTargetElement = () => {
      console.log('Looking for target:', currentStepData.targetSelector);
      
      if (currentStepData.targetSelector === 'center') {
        setTargetElement(null);
        setIsReady(true);
        setRetryCount(0);
        setIsTransitioning(false);
        return;
      }

      try {
        const element = document.querySelector(currentStepData.targetSelector);
        console.log('Found element:', element);
        
        if (element) {
          setTargetElement(element);
          setRetryCount(0);
          
          // Gentle scroll element into view if needed, only if it's not already visible
          const rect = element.getBoundingClientRect();
          const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
          
          if (!isVisible) {
            setTimeout(() => {
              element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest',
              });
            }, 100);
          }
          
          // Set ready after a shorter delay
          setTimeout(() => {
            setIsReady(true);
            setIsTransitioning(false);
          }, 300);
        } else {
          // Retry with shorter delays, max retries based on step type
          const maxRetries = currentStepData.id === 'created-river-walk' ? 10 : 5;
          const delay = currentStepData.id === 'created-river-walk' ? 300 : 200;
          
          if (retryCount < maxRetries) {
            console.log(`Element not found, retrying in ${delay}ms (attempt ${retryCount + 1})`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              findTargetElement();
            }, delay);
          } else {
            console.warn(`Element not found after ${maxRetries} retries, showing centered tutorial`);
            setTargetElement(null);
            setIsReady(true);
            setRetryCount(0);
            setIsTransitioning(false);
          }
        }
      } catch (error) {
        console.error('Error finding target element:', error);
        setTargetElement(null);
        setIsReady(true);
        setRetryCount(0);
        setIsTransitioning(false);
      }
    };

    // Reset state and start fresh
    setIsReady(false);
    setTargetElement(null);
    setRetryCount(0);
    setIsTransitioning(true);
    
    // Small delay to ensure DOM is ready
    setTimeout(findTargetElement, 300);
  }, [currentStepData, isVisible, retryCount]);

  useEffect(() => {
    if (isReady && onStepComplete && currentStepData) {
      onStepComplete(currentStepData.id);
    }
  }, [isReady, currentStepData, onStepComplete]);

  if (!isVisible || !currentStepData) {
    return null;
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Dark overlay with spotlight */}
      <Spotlight targetElement={targetElement} overlayRef={overlayRef} />
      
      {/* Tooltip - show when ready and not transitioning */}
      {isReady && !isTransitioning && (
        <div className="pointer-events-auto" key={`tooltip-${currentStepData.id}`}>
          <TutorialTooltip
            step={currentStepData}
            targetElement={targetElement}
            onNext={onNext}
            onPrevious={onPrevious}
            onSkip={onSkip}
            onExit={onExit}
            onFullyExit={onFullyExit}
            currentStep={currentStep}
            totalSteps={steps.length}
            demoFormData={demoFormData}
            onDemoFormChange={onDemoFormChange}
          />
        </div>
      )}
    </div>
  );
};