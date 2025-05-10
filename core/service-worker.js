/**
 * Health Tracker PWA Service Worker
 */

// Cache name (Update version when making changes to files)
const CACHE_NAME = "health-tracker-v2";

// Files to cache
const FILES_TO_CACHE = [
  '/',
  'index.html',
  'core/core-styles.css',
  'core/core-scripts.js',
  'core/notification.js',
  'core/ui.js',
  'trackers/trackers-scripts.js',
  'trackers/trackers-styles.css',
  'workouts/workouts-scripts.js',
  'workouts/workouts-styles.css',
  'habits/habits-scripts.js',
  'habits/habits-styles.css',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
];

// Install event - Precache static resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  // Precache static resources
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell and content');
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch((error) => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  
  // Clear old caches
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  
  // Ensure the service worker takes control immediately
  self.clients.claim();
});

// Fetch event - Serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            // Return cached response
            return response;
          }
          
          // Fetch from network
          return fetch(event.request)
            .then((response) => {
              // Check if valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone the response
              const responseToCache = response.clone();
              
              // Cache the fetched response
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch((error) => {
              console.error('[Service Worker] Fetch failed:', error);
              // You could return a custom offline page here
            });
        })
    );
  }
});

// Push event - Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let title = 'Tracker';
  let options = {
    body: 'Time to log your health data!',
    icon: 'icon-192.png',
    badge: 'icon-192.png'
  };
  
  // Try to parse the push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
    }
  }
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event);
  
  // Close notification
  event.notification.close();
  
  // Open app/specific page when notification is clicked
  event.waitUntil(
    clients.openWindow('/')
      .then((windowClient) => {
        // Focus if already open
        if (windowClient) {
          return windowClient.focus();
        }
      })
  );
});