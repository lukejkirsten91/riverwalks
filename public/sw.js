// Riverwalks Service Worker for Offline Capabilities
const CACHE_NAME = 'riverwalks-v6';
const STATIC_CACHE_NAME = 'riverwalks-static-v6';
const DYNAMIC_CACHE_NAME = 'riverwalks-dynamic-v6';

// App shell - critical files for offline functionality
const APP_SHELL = [
  '/',
  '/river-walks',
  '/river-walks/new',
  '/offline',
  '/_next/static/css/app.css',
  '/favicon.ico',
  '/logo.png',
  '/powers_roundness_scale.png',
  // Add more critical assets as needed
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('Service Worker: App shell cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache app shell', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim(); // Take control of all pages
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (except for same-origin API calls)
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first, then show offline message
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - cache first
    event.respondWith(handleStaticAssets(request));
  } else if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
    // Images and static files - cache first with long expiry
    event.respondWith(handleImageAssets(request));
  } else if (url.pathname.match(/^\/river-walks\/[^/]+\/(sites|report|edit|share)$/)) {
    // Dynamic river-walks pages - special handling for offline
    event.respondWith(handleRiverWalksPageRequest(request));
  } else {
    // Other pages - network first, fallback to cache
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with offline fallback
async function handleApiRequest(request) {
  try {
    // Set a reasonable timeout for API requests
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 8000)
    );
    
    const response = await Promise.race([fetch(request), timeoutPromise]);
    
    // Cache successful responses for future offline use
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      // Only cache GET requests to avoid caching mutations
      if (request.method === 'GET') {
        cache.put(request, response.clone());
      }
    }
    
    return response;
  } catch (error) {
    console.log('Service Worker: API request failed, checking cache:', error.message);
    
    // Try to serve from cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('Service Worker: Serving cached API response');
        return cachedResponse;
      }
    }
    
    // For non-GET requests or when no cache is available, return a proper error
    // that the offline service can handle gracefully
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'This request requires an internet connection',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json'
        })
      }
    );
  }
}

// Handle static assets with cache first strategy
async function handleStaticAssets(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset', request.url);
    throw error;
  }
}

// Handle image assets with cache first strategy and long expiry
async function handleImageAssets(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('Service Worker: Serving cached image', request.url);
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      console.log('Service Worker: Caching new image', request.url);
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Service Worker: Failed to fetch image, offline mode', request.url);
    
    // For critical images like Powers roundness scale, provide a better fallback
    if (request.url.includes('powers_roundness_scale')) {
      const fallbackSvg = `
        <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg" style="background: #f9fafb; border: 1px solid #e5e7eb;">
          <text x="200" y="40" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#374151">Powers Roundness Scale</text>
          <text x="200" y="60" text-anchor="middle" font-family="Arial" font-size="12" fill="#6b7280">Reference unavailable offline</text>
          
          <g font-family="Arial" font-size="11" fill="#374151">
            <text x="80" y="90">1 = Very Angular</text>
            <text x="80" y="110">2 = Angular</text>
            <text x="80" y="130">3 = Sub-angular</text>
            <text x="280" y="90">4 = Sub-rounded</text>
            <text x="280" y="110">5 = Rounded</text>
            <text x="280" y="130">6 = Very Rounded</text>
          </g>
          
          <text x="200" y="170" text-anchor="middle" font-family="Arial" font-size="10" fill="#9ca3af">Image will load when online</text>
        </svg>
      `;
      
      return new Response(fallbackSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    throw error;
  }
}

// Handle river-walks dynamic pages with smart offline fallback
async function handleRiverWalksPageRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Service Worker: River-walks page request failed, checking cache');
    
    // First try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Service Worker: Serving cached river-walks page');
      return cachedResponse;
    }
    
    // If not cached, create a generic river-walks page that can handle the route client-side
    console.log('Service Worker: Creating generic river-walks page for offline access');
    const genericRiverWalksResponse = await caches.match('/river-walks');
    if (genericRiverWalksResponse) {
      // Clone and modify the response to inject offline mode flag
      const clonedResponse = genericRiverWalksResponse.clone();
      let htmlContent = await clonedResponse.text();
      
      // Inject script to set offline mode flag before any other scripts run
      const offlineModeScript = `
        <script>
          // Set offline mode flag to prevent onboarding flows
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('riverwalks_offline_mode', 'true');
            console.log('Service Worker: Set offline mode flag for fallback navigation');
          }
        </script>
      `;
      
      // Insert the script right after the <head> tag
      htmlContent = htmlContent.replace('<head>', '<head>' + offlineModeScript);
      
      return new Response(htmlContent, {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    // Final fallback to offline page
    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    throw error;
  }
}

// Handle page requests with network first, cache fallback
async function handlePageRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Service Worker: Page request failed, checking cache');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page for navigation requests
    if (request.destination === 'document') {
      const fallbackResponse = await caches.match('/offline');
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }
    
    throw error;
  }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'riverwalks-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  console.log('Service Worker: Syncing offline data...');
  
  try {
    // This will be implemented when we add IndexedDB
    // For now, just notify the main thread
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_REQUESTED',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Service Worker: Failed to sync offline data', error);
  }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    default:
      console.log('Service Worker: Unknown message type', type);
  }
});