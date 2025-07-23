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
import { serviceWorker } from '../lib/serviceWorker';
import Head from 'next/head';

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

  // Register service worker for PWA functionality
  useEffect(() => {
    if (typeof window !== 'undefined') {
      serviceWorker.register();
    }
  }, []);

  return (
    <ErrorBoundary>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="application-name" content="Riverwalks" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Riverwalks" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>
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
