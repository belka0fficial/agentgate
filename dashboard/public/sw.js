const CACHE_NAME = 'agentgate-shell-v2'
const OFFLINE_FALLBACK_URL = '/offline.html'
const APP_SHELL_ROUTES = ['/', OFFLINE_FALLBACK_URL]
const SENSITIVE_ROUTE_PREFIXES = [
  '/api',
  '/health',
  '/sign-in',
  '/sign-up',
  '/otp',
  '/forgot-password',
]

function shouldBypassServiceWorkerCache(url) {
  return SENSITIVE_ROUTE_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_ROUTES))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('agentgate-shell-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (shouldBypassServiceWorkerCache(url)) {
    if (request.mode === 'navigate') {
      event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_FALLBACK_URL, { ignoreSearch: true })))
    }
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_FALLBACK_URL, { ignoreSearch: true }))
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse

      return fetch(request).then((networkResponse) => {
        const isHashedBuildAsset = /^\/assets\/[A-Za-z0-9._-]+-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(url.pathname)
        const isKnownShellAsset =
          url.pathname === '/manifest.webmanifest' ||
          url.pathname === '/icons/agentgate-192.svg' ||
          url.pathname === '/icons/agentgate-512.svg'
        const isCacheableShellAsset = networkResponse.ok && (isHashedBuildAsset || isKnownShellAsset)

        if (isCacheableShellAsset) {
          const responseClone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
        }

        return networkResponse
      })
    })
  )
})
