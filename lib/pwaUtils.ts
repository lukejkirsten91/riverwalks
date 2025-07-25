// PWA Detection and Utilities

/**
 * Check if the app is running in PWA (standalone) mode
 */
export function isPWAMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for standalone mode (PWA installed and launched from home screen)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Also check for iOS PWA mode
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  return isStandalone || isIOSStandalone;
}

/**
 * Check if the app was launched from a PWA context
 * This includes both installed PWAs and browser PWA prompts
 */
export function isPWAContext(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check various PWA indicators
  const hasManifest = document.querySelector('link[rel="manifest"]');
  const isStandalone = isPWAMode();
  const hasServiceWorker = 'serviceWorker' in navigator;
  
  // URL parameter indicating PWA launch
  const urlParams = new URLSearchParams(window.location.search);
  const pwaParam = urlParams.get('v'); // Our manifest uses /?v=2.1
  
  return !!(hasManifest && hasServiceWorker && (isStandalone || pwaParam));
}

/**
 * Get the appropriate redirect URL for authenticated users
 * PWA users go directly to river-walks, web users can stay on landing page
 */
export function getAuthenticatedRedirectUrl(): string {
  if (isPWAMode()) {
    return '/river-walks';
  }
  
  // For web users, let them stay on the landing page with user info shown
  return '/';
}

/**
 * Configure Supabase client for PWA with persistent sessions
 */
export function getPWASupabaseConfig() {
  return {
    auth: {
      // Use localStorage for persistent sessions (survives app restarts)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'riverwalks-pwa-auth',
      // Auto refresh tokens
      autoRefreshToken: true,
      // Persist session across app launches
      persistSession: true,
      // Detect session in URL and storage
      detectSessionInUrl: true,
    }
  };
}

/**
 * Check if user should be redirected on app launch
 */
export function shouldRedirectAuthenticatedUser(user: any): boolean {
  // Always redirect in PWA mode
  if (isPWAMode()) {
    return !!user;
  }
  
  // In web mode, don't redirect (let them see landing page)
  return false;
}