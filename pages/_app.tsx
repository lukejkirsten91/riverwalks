import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ToastProvider } from '../components/ui/ToastProvider';
import { CookieBanner } from '../components/ui/CookieBanner';
import { OfflineIndicator } from '../components/ui/OfflineIndicator';
import { SyncStatus } from '../components/ui/SyncStatus';
import { SyncStatusProvider } from '../contexts/SyncStatusContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <SyncStatusProvider>
        <div className="relative">
          {/* Global status indicators */}
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
            <OfflineIndicator />
            <SyncStatus />
          </div>
          
          <Component {...pageProps} />
          <CookieBanner />
        </div>
      </SyncStatusProvider>
    </ToastProvider>
  );
}

export default MyApp;
