import { describe, expect, it } from 'vitest'
import {
  APP_SHELL_ROUTES,
  OFFLINE_FALLBACK_URL,
  PWA_MANIFEST,
  shouldBypassServiceWorkerCache,
} from './pwa'

describe('AgentGate PWA metadata', () => {
  it('defines an installable manifest with local icons and app route scope', () => {
    expect(PWA_MANIFEST).toMatchObject({
      name: 'AgentGate',
      short_name: 'AgentGate',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#050608',
      theme_color: '#050608',
    })

    expect(PWA_MANIFEST.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: '/icons/agentgate-192.svg',
          sizes: '192x192',
        }),
        expect.objectContaining({
          src: '/icons/agentgate-512.svg',
          sizes: '512x512',
        }),
      ])
    )
  })

  it('keeps the offline fallback and build routes shell-only', () => {
    expect(OFFLINE_FALLBACK_URL).toBe('/offline.html')
    expect(APP_SHELL_ROUTES).toEqual(['/', '/offline.html'])
  })
})

describe('AgentGate public PWA assets', () => {
  it('serves a manifest that matches the installability contract', async () => {
    const response = await fetch('/manifest.webmanifest')
    const manifest = await response.json()

    expect(response.ok).toBe(true)
    expect(manifest).toMatchObject(PWA_MANIFEST)
  })

  it('exposes manifest and mobile metadata from the built app shell document', async () => {
    const response = await fetch('/')
    const html = await response.text()

    expect(response.ok).toBe(true)
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('viewport-fit=cover')
    expect(html).toContain('mobile-web-app-capable')
  })

  it('serves an honest offline fallback that does not claim live state', async () => {
    const response = await fetch(OFFLINE_FALLBACK_URL)
    const html = await response.text()

    expect(response.ok).toBe(true)
    expect(html).toContain('AgentGate shell is available, data is not')
    expect(html).toContain(
      'live AgentGate, auth, session, API, health, and owner data are not cached'
    )
    expect(html).toContain('stale until the')
    expect(html).not.toMatch(/connected|healthy|secure/i)
  })

  it('service worker file bypasses sensitive routes and only precaches the shell fallback', async () => {
    const response = await fetch('/sw.js')
    const serviceWorkerSource = await response.text()

    expect(response.ok).toBe(true)
    expect(serviceWorkerSource).toContain(
      "const CACHE_NAME = 'agentgate-shell-v2'"
    )
    expect(serviceWorkerSource).toContain("key.startsWith('agentgate-shell-')")
    expect(serviceWorkerSource).toContain('caches.delete')
    expect(serviceWorkerSource).toContain("'/api'")
    expect(serviceWorkerSource).toContain("'/health'")
    expect(serviceWorkerSource).toContain("'/sign-in'")
    expect(serviceWorkerSource).toContain("'/otp'")
    expect(serviceWorkerSource).toContain('shouldBypassServiceWorkerCache(url)')
    expect(serviceWorkerSource).toContain(
      "const APP_SHELL_ROUTES = ['/', OFFLINE_FALLBACK_URL]"
    )
    expect(serviceWorkerSource).not.toContain("cache.addAll(['/api")
    expect(serviceWorkerSource).not.toContain('Authorization')
    expect(serviceWorkerSource).not.toContain("contentType.includes('image/')")
    expect(serviceWorkerSource).toContain(
      '/^\\/assets\\/[A-Za-z0-9._-]+-[A-Za-z0-9_-]{8,}\\.(?:js|css)$/'
    )
  })
})

describe('AgentGate service worker cache policy', () => {
  it.each([
    '/api/health',
    '/api/sessions',
    '/health',
    '/sign-in',
    '/sign-up',
    '/otp',
    '/forgot-password',
  ])('bypasses cache for sensitive route %s', (url) => {
    expect(
      shouldBypassServiceWorkerCache(new URL(url, 'https://agentgate.local'))
    ).toBe(true)
  })

  it.each([
    '/',
    '/offline.html',
    '/assets/app-12345678.js',
    '/icons/agentgate-192.svg',
  ])('allows shell asset %s to be cacheable', (url) => {
    expect(
      shouldBypassServiceWorkerCache(new URL(url, 'https://agentgate.local'))
    ).toBe(false)
  })
})
