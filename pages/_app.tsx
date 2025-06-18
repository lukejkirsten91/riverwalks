import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ToastProvider } from '../components/ui/ToastProvider';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );
}

export default MyApp;
