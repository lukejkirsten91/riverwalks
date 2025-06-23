import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ToastProvider } from '../components/ui/ToastProvider';
import { CookieBanner } from '../components/ui/CookieBanner';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <Component {...pageProps} />
      <CookieBanner />
    </ToastProvider>
  );
}

export default MyApp;
