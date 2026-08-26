export const OFFLINE_FALLBACK_URL = '/offline.html'

export const APP_SHELL_ROUTES = ['/', OFFLINE_FALLBACK_URL] as const

export const PWA_MANIFEST = {
  name: 'AgentGate',
  short_name: 'AgentGate',
  description: 'Private command surface for a local personal agent.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#050608',
  theme_color: '#050608',
  categories: ['productivity', 'utilities'],
  icons: [
    {
      src: '/icons/agentgate-192.svg',
      sizes: '192x192',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
    {
      src: '/icons/agentgate-512.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
  ],
} as const

const sensitiveRoutePrefixes = [
  '/api',
  '/health',
  '/sign-in',
  '/sign-up',
  '/otp',
  '/forgot-password',
] as const

export function shouldBypassServiceWorkerCache(url: URL) {
  return sensitiveRoutePrefixes.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  )
}

export function registerAgentGateServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Registration failures leave AgentGate as a normal web app.
    })
  })
}
