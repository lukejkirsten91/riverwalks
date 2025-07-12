import Link from 'next/link';
import { Cookie, X, BarChart3, Settings, AlertCircle } from 'lucide-react';
import { useCookieConsent } from '../../contexts/CookieConsentContext';

export function CookieBanner() {
  const { showBanner, acceptAll, acceptEssential, dismissBanner } = useCookieConsent();

  if (!showBanner) {
    return null;
  }

  // Check if this is a policy update (user had previous consent)
  const hadPreviousConsent = localStorage.getItem('cookie-consent') === null && 
                            localStorage.getItem('cookie-banner-dismissed') === null &&
                            localStorage.getItem('policy-version') !== null;
  
  const isUpdatedPolicy = hadPreviousConsent;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {isUpdatedPolicy ? (
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              ) : (
                <Cookie className="w-5 h-5 text-amber-600 mt-0.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {isUpdatedPolicy ? (
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    🔄 Privacy Policy Updated
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    We've updated our privacy practices to include <strong>Google Analytics</strong> for better user experience insights. 
                    Please review your cookie preferences. Learn more in our updated{' '}
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
                </div>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-medium">We value your privacy:</span> This site uses essential cookies for core functionality and optional analytics cookies to improve your experience. 
                  You can choose which cookies to accept. Learn more in our{' '}
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
              )}
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <button
                  onClick={acceptAll}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Accept All
                </button>
                <button
                  onClick={acceptEssential}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Essential Only
                </button>
                <Link
                  href="/cookies"
                  target="_blank"
                  className="text-center sm:text-left px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2 justify-center sm:justify-start"
                >
                  <Settings className="w-4 h-4" />
                  Customize
                </Link>
              </div>
            </div>
            <button
              onClick={dismissBanner}
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