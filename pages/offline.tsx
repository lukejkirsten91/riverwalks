import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [attemptedRoute, setAttemptedRoute] = useState<string>('');

  useEffect(() => {
    // Check if we're online
    const checkOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Get the attempted route from the URL
    const currentPath = window.location.pathname;
    setAttemptedRoute(currentPath);

    // Prevent onboarding/welcome flows from triggering on offline page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('riverwalks_offline_mode', 'true');
    }

    // Listen for online/offline events
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);

    // Initial check
    checkOnlineStatus();

    // If we come back online, try to navigate to the original route
    const handleOnline = () => {
      if (navigator.onLine && currentPath !== '/offline') {
        // Clear offline mode flag
        sessionStorage.removeItem('riverwalks_offline_mode');
        // Small delay to ensure network is ready
        setTimeout(() => {
          window.location.href = currentPath;
        }, 1000);
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', checkOnlineStatus);
      window.removeEventListener('offline', checkOnlineStatus);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      // Clear offline mode flag
      sessionStorage.removeItem('riverwalks_offline_mode');
      // If we're online, try to navigate to the attempted route
      if (attemptedRoute && attemptedRoute !== '/offline') {
        window.location.href = attemptedRoute;
      } else {
        router.push('/river-walks');
      }
    }
  };

  const goToRiverWalks = () => {
    // Clear offline mode flag
    sessionStorage.removeItem('riverwalks_offline_mode');
    router.push('/river-walks');
  };

  return (
    <>
      <Head>
        <title>Working Offline - Riverwalks</title>
        <meta name="description" content="You're currently offline. Some features may not be available." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                  />
                </svg>
              </div>
              
              <h1 className="text-lg font-medium text-gray-900 mb-2">
                {isOnline ? 'Page Not Available' : 'Working Offline'}
              </h1>
              
              <p className="text-sm text-gray-500 mb-6">
                {isOnline 
                  ? 'This page isn\'t available offline. Please check your connection and try again.'
                  : 'You\'re currently offline. Some features may not be available until you reconnect.'
                }
              </p>

              {attemptedRoute && attemptedRoute !== '/offline' && (
                <p className="text-xs text-gray-400 mb-4">
                  Attempted to visit: {attemptedRoute}
                </p>
              )}

              <div className="space-y-3">
                {isOnline && (
                  <button
                    onClick={handleRetry}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try Again
                  </button>
                )}
                
                <button
                  onClick={goToRiverWalks}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to River Walks
                </button>
              </div>

              <div className="mt-6 text-xs text-gray-400">
                <p>
                  Status: <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}