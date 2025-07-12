import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initGA, trackPageView } from '../lib/analytics';

interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentContextType {
  consent: CookieConsent;
  setAnalyticsConsent: (enabled: boolean) => void;
  setMarketingConsent: (enabled: boolean) => void;
  hasConsented: boolean;
  showBanner: boolean;
  acceptAll: () => void;
  acceptEssential: () => void;
  dismissBanner: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

const STORAGE_KEY = 'cookie-consent';
const BANNER_DISMISSED_KEY = 'cookie-banner-dismissed';

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent>({
    essential: true, // Always required
    analytics: false,
    marketing: false,
  });
  
  const [hasConsented, setHasConsented] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Load consent from localStorage on mount
  useEffect(() => {
    const storedConsent = localStorage.getItem(STORAGE_KEY);
    const bannerDismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    
    if (storedConsent) {
      const parsed = JSON.parse(storedConsent);
      setConsent(parsed);
      setHasConsented(true);
      
      // Initialize GA if analytics consent is given
      if (parsed.analytics) {
        initGA();
      }
    } else if (!bannerDismissed) {
      // Show banner after delay if no consent stored
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Save consent to localStorage whenever it changes
  useEffect(() => {
    if (hasConsented) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
      
      // Initialize or disable GA based on analytics consent
      if (consent.analytics) {
        initGA();
        // Track current page view
        trackPageView(window.location.href);
      }
    }
  }, [consent, hasConsented]);

  const setAnalyticsConsent = (enabled: boolean) => {
    setConsent(prev => ({ ...prev, analytics: enabled }));
  };

  const setMarketingConsent = (enabled: boolean) => {
    setConsent(prev => ({ ...prev, marketing: enabled }));
  };

  const acceptAll = () => {
    setConsent({
      essential: true,
      analytics: true,
      marketing: true,
    });
    setHasConsented(true);
    setShowBanner(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  const acceptEssential = () => {
    setConsent({
      essential: true,
      analytics: false,
      marketing: false,
    });
    setHasConsented(true);
    setShowBanner(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    // Default to essential only if no consent given
    if (!hasConsented) {
      acceptEssential();
    }
  };

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        setAnalyticsConsent,
        setMarketingConsent,
        hasConsented,
        showBanner,
        acceptAll,
        acceptEssential,
        dismissBanner,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}