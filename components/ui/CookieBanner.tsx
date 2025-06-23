import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the banner
    const cookieConsent = localStorage.getItem('cookie-banner-dismissed');
    if (!cookieConsent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('cookie-banner-dismissed', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Cookie className="w-5 h-5 text-amber-600 mt-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-medium">Essential Cookies Notice:</span> This site uses essential cookies for authentication and core functionality. 
                We do not use tracking or advertising cookies. Learn more in our{' '}
                <Link 
                  href="/cookies" 
                  target="_blank"
                  className="text-primary hover:text-primary/80 underline"
                >
                  Cookie Policy
                </Link>
                {' '}and{' '}
                <Link 
                  href="/privacy" 
                  target="_blank"
                  className="text-primary hover:text-primary/80 underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <button
                  onClick={handleDismiss}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Got it
                </button>
                <Link
                  href="/cookies"
                  target="_blank"
                  className="text-center sm:text-left px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Learn more
                </Link>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close cookie notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}