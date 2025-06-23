import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ToastProvider } from '../components/ui/ToastProvider';
import { CookieBanner } from '../components/ui/CookieBanner';
import { OfflineIndicator } from '../components/ui/OfflineIndicator';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <div className="relative">
        {/* Global offline indicator */}
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <OfflineIndicator />
        </div>
        
        <Component {...pageProps} />
        <CookieBanner />
      </div>
    </ToastProvider>
  );
}

export default MyApp;
