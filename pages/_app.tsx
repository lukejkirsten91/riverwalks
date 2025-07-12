import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ToastProvider } from '../components/ui/ToastProvider';
import { CookieBanner } from '../components/ui/CookieBanner';
import { OfflineIndicator } from '../components/ui/OfflineIndicator';
import { SyncStatus } from '../components/ui/SyncStatus';
import { SyncStatusProvider } from '../contexts/SyncStatusContext';
import { CookieConsentProvider } from '../contexts/CookieConsentContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { trackPageView } from '../lib/analytics';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Initialize performance monitoring
  usePerformanceMonitoring();

  // Track page views for Google Analytics
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      trackPageView(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <ErrorBoundary>
      <CookieConsentProvider>
        <ToastProvider>
          <SyncStatusProvider>
            <div className="relative">
              {/* Global status indicators - centered at top */}
              <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[70] flex flex-col gap-3 items-center">
                <OfflineIndicator className="shadow-modern border border-white/20" />
                <SyncStatus className="shadow-modern border border-white/20" />
              </div>
              
              <Component {...pageProps} />
              <CookieBanner />
            </div>
            <Analytics />
          </SyncStatusProvider>
        </ToastProvider>
      </CookieConsentProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
