import { useEffect } from 'react';

/**
 * Custom hook to prevent background scrolling when modals/popups are open
 * @param isOpen - Whether the modal is currently open
 */
export function useScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen) {
      // Store the current scroll position
      const scrollY = window.scrollY;
      
      // Apply styles to prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      document.body.style.touchAction = 'none';
      
      // Also apply to html element for extra protection
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
      
      // Store scroll position for restoration
      document.body.setAttribute('data-scroll-y', scrollY.toString());
      
      return () => {
        // Cleanup function to restore scrolling
        const storedScrollY = document.body.getAttribute('data-scroll-y');
        
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.overscrollBehavior = '';
        document.body.style.touchAction = '';
        document.body.removeAttribute('data-scroll-y');
        
        // Restore html element
        document.documentElement.style.overflow = '';
        document.documentElement.style.overscrollBehavior = '';
        
        // Restore scroll position
        if (storedScrollY) {
          window.scrollTo(0, parseInt(storedScrollY, 10));
        }
      };
    }
  }, [isOpen]);
}