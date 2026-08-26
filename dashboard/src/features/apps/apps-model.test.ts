import { describe, expect, it } from 'vitest'
import {
  appActionEnabled,
  appActionsEnabled,
  appStatusLabel,
  normalizeAppsResponse,
} from './apps-model'

describe('Apps and Projects helpers', () => {
  it('normalizes source-bound app registry rows without unsafe fields', () => {
    const apps = normalizeAppsResponse({
      apps: [
        {
          id: 'app-1',
          name: 'Local Notes',
          description: 'Private notes workspace',
          purpose: 'Write notes',
          url: 'http://127.0.0.1:9000',
          health_url: 'http://127.0.0.1:9000/health',
          command: 'npm run dev',
          env: { OPENAI_API_KEY: 'sk-test' },
          docker_socket: '/var/run/docker.sock',
          provider_url: 'https://api.openai.com/v1',
          source: 'brain',
          source_ref: 'local-app-ref-1',
          local_ref: 'opaque-local-ref-1',
          status: 'live',
          pinned: true,
          lifecycle: { available: false, status: 'planned' },
          metadata_only: true,
        },
      ],
    })

    expect(apps).toHaveLength(1)
    expect(apps[0]).toMatchObject({
      id: 'app-1',
      name: 'Local Notes',
      purpose: 'Write notes',
      source: 'brain',
      source_ref: 'local-app-ref-1',
      local_ref: 'opaque-local-ref-1',
      status: 'live',
      pinned: true,
      metadata_only: true,
    })
    expect(appActionsEnabled(apps[0])).toBe(false)
    expect(appStatusLabel(apps[0])).toBe('live from brain')
    const encoded = JSON.stringify(apps)
    for (const unsafe of [
      '127.0.0.1',
      'health',
      'npm run dev',
      'OPENAI_API_KEY',
      'sk-test',
      '/var/run/docker.sock',
      'api.openai.com',
      'provider_url',
      'command',
      'env',
    ]) {
      expect(encoded).not.toContain(unsafe)
    }
  })

  it('keeps lifecycle actions unavailable unless backend marks them real', () => {
    const [planned, live] = normalizeAppsResponse({
      apps: [
        { id: 'planned', name: 'Planned', lifecycle: { available: false } },
        {
          id: 'live',
          name: 'Live',
          lifecycle: {
            available: true,
            status: 'live',
            actions: ['start', 'stop', 'restart'],
          },
        },
      ],
    })

    expect(appActionsEnabled(planned)).toBe(false)
    expect(appActionsEnabled(live)).toBe(true)
  })
})

it('enables only lifecycle actions explicitly reported by the source', () => {
  const app = normalizeAppsResponse({
    apps: [
      {
        id: 'a',
        name: 'A',
        lifecycle: { available: true, actions: ['start'] },
      },
    ],
  })[0]
  expect(appActionEnabled(app, 'start')).toBe(true)
  expect(appActionEnabled(app, 'stop')).toBe(false)
  expect(appActionEnabled(app, 'restart')).toBe(false)
})
