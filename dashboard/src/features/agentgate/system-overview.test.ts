import { describe, expect, it } from 'vitest'
import { buildSystemOverview } from './system-overview'

describe('buildSystemOverview', () => {
  it('uses only point-in-time SystemGate fields and does not invent trends or free capacity', () => {
    const overview = buildSystemOverview({
      vitals: {
        cpu_percent: 12,
        cpu_count: 8,
        memory: { percent: 41 },
        disk: { percent: 59 },
      },
      containers: [
        { name: 'agentgate', status: 'running', cpu: '1.5', memory: '240MiB' },
      ],
      backups: { latest: { name: 'snap-1', age_hours: 7 } },
    })

    expect(overview.stats).toEqual([
      {
        title: 'CPU',
        value: '12%',
        note: '8 cores · current sample',
        state: 'live',
      },
      { title: 'Memory', value: '41%', note: 'current sample', state: 'live' },
      { title: 'Disk', value: '59%', note: 'current sample', state: 'live' },
      {
        title: 'Backup',
        value: '7h',
        note: 'snap-1 · source reported age',
        state: 'live',
      },
    ])
  })

  it('marks unavailable SystemGate sections degraded or unknown instead of rendering fake values', () => {
    const overview = buildSystemOverview({
      vitals: { error: 'connection refused' },
      containers: { error: 'not configured' },
      backups: {},
    })

    expect(overview.stats).toEqual([
      {
        title: 'CPU',
        value: 'unknown',
        note: 'SystemGate unavailable',
        state: 'degraded',
      },
      {
        title: 'Memory',
        value: 'unknown',
        note: 'SystemGate unavailable',
        state: 'degraded',
      },
      {
        title: 'Disk',
        value: 'unknown',
        note: 'SystemGate unavailable',
        state: 'degraded',
      },
      {
        title: 'Backup',
        value: 'unknown',
        note: 'No backup source data',
        state: 'unknown',
      },
    ])
    expect(overview.services).toEqual([])
  })
})

it('keeps unloaded state unknown instead of degraded or empty', () => {
  expect(buildSystemOverview(undefined)).toEqual({
    stats: [
      {
        title: 'CPU',
        value: 'unknown',
        note: 'SystemGate not loaded',
        state: 'unknown',
      },
      {
        title: 'Memory',
        value: 'unknown',
        note: 'SystemGate not loaded',
        state: 'unknown',
      },
      {
        title: 'Disk',
        value: 'unknown',
        note: 'SystemGate not loaded',
        state: 'unknown',
      },
      {
        title: 'Backup',
        value: 'unknown',
        note: 'SystemGate not loaded',
        state: 'unknown',
      },
    ],
    services: [],
    serviceState: 'unknown',
    backupState: 'unknown',
  })
})
