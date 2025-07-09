/**
 * Utility to reset any modal-related styling that might be persisting
 * This helps fix iOS Safari button blocking issues
 */
export function resetModalStyles() {
  if (typeof window === 'undefined') return;

  // Reset body styles that might be set by useScrollLock
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.overflow = '';
  document.body.style.overscrollBehavior = '';
  document.body.style.touchAction = '';
  document.body.removeAttribute('data-scroll-y');
  
  // Reset html element styles
  document.documentElement.style.overflow = '';
  document.documentElement.style.overscrollBehavior = '';
  
  // Remove any modal backdrop elements that might be stuck
  const modalBackdrops = document.querySelectorAll('[data-modal-backdrop]');
  modalBackdrops.forEach(backdrop => backdrop.remove());
  
  // Remove any fixed positioning overlays
  const fixedElements = document.querySelectorAll('[style*="position: fixed"]');
  fixedElements.forEach(element => {
    const htmlElement = element as HTMLElement;
    if (htmlElement.style.position === 'fixed' && 
        htmlElement.style.zIndex && 
        parseInt(htmlElement.style.zIndex) > 40) {
      htmlElement.remove();
    }
  });
}