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
          {/* Global status indicators - centered at top */}
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[70] flex flex-col gap-3 items-center">
            <OfflineIndicator className="shadow-modern border border-white/20" />
            <SyncStatus className="shadow-modern border border-white/20" />
          </div>
          
          <Component {...pageProps} />
          <CookieBanner />
        </div>
      </SyncStatusProvider>
    </ToastProvider>
  );
}

export default MyApp;
