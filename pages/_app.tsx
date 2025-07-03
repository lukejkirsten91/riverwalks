import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/react';
import { ToastProvider } from '../components/ui/ToastProvider';
import { CookieBanner } from '../components/ui/CookieBanner';
import { OfflineIndicator } from '../components/ui/OfflineIndicator';
import { SyncStatus } from '../components/ui/SyncStatus';
import { SyncStatusProvider } from '../contexts/SyncStatusContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

function MyApp({ Component, pageProps }: AppProps) {
  // Initialize performance monitoring
  usePerformanceMonitoring();

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default MyApp;
