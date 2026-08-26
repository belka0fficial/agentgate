import { describe, expect, it } from 'vitest'
import {
  buildMemoryDetail,
  memoryOverviewErrors,
  memoryOverviewState,
  normalizeMemoryRecords,
} from './memory-overview'

describe('memory overview normalization', () => {
  it('renders MemoryGate supplied source fields without inventing evidence chains', () => {
    const [record] = normalizeMemoryRecords([
      {
        id: 'm1',
        title: 'Owner prefers concise summaries',
        kind: 'preference',
        confidence: 'high',
        updated_at: '2030-01-02T00:00:00Z',
        source: 'session',
        evidence: [{ label: 'chat', ref: 's1' }],
      },
    ])

    expect(record).toMatchObject({
      id: 'm1',
      state: 'fact',
      title: 'Owner prefers concise summaries',
    })
    expect(buildMemoryDetail(record).evidence).toEqual(['chat: s1'])
  })

  it('uses empty and unknown states when MemoryGate gives no records or source detail', () => {
    expect(normalizeMemoryRecords({ error: 'offline' })).toEqual([])
    const [record] = normalizeMemoryRecords([
      {
        id: 'p1',
        title: 'Possible routine',
        kind: 'pattern',
        confidence: 'medium',
      },
    ])

    expect(record.state).toBe('pattern')
    expect(buildMemoryDetail(record).evidence).toEqual([
      'Source detail not provided by MemoryGate overview.',
    ])
  })
})

it('redacts host paths and provider URLs from browser-facing source detail', () => {
  const [record] = normalizeMemoryRecords([
    {
      id: 'm2',
      title: 'Sensitive source test',
      kind: 'fact',
      confidence: 'high',
      source_uri: 'file:///home/alexeybe1kin/private/memory.json',
      evidence: [
        { label: 'provider', url: 'https://api.openai.com/v1/responses' },
        { label: 'safe-note', ref: 'memory-note-1' },
      ],
    },
  ])

  const detail = buildMemoryDetail(record)
  expect(detail.source).toBe('reference withheld')
  expect(detail.evidence).toEqual(['provider', 'safe-note: memory-note-1'])
  expect(JSON.stringify(detail)).not.toContain('/home/alexeybe1kin')
  expect(JSON.stringify(detail)).not.toContain('api.openai.com')
})

it('surfaces MemoryGate section errors as degraded rather than empty', () => {
  const payload = {
    errors: {
      briefing: {
        source: 'memorygate',
        message: 'Service unreachable at https://api.openai.com/private',
      },
      memories: 'connection refused',
    },
    memories: [],
  }
  const records = normalizeMemoryRecords(payload)

  expect(memoryOverviewErrors(payload)).toEqual([
    'briefing: reference withheld',
    'memories: connection refused',
  ])
  expect(memoryOverviewState(payload, records)).toBe('degraded')
  expect(JSON.stringify(memoryOverviewErrors(payload))).not.toContain(
    'api.openai.com'
  )
})

it('merges observations and patterns instead of showing a false empty state', () => {
  const payload = {
    memories: [],
    observations: [
      { id: 'o1', title: 'Observed fact', kind: 'fact', confidence: 'high' },
    ],
    patterns: [
      { id: 'p1', title: 'Pattern', kind: 'pattern', confidence: 'medium' },
    ],
  }
  const records = normalizeMemoryRecords(payload)

  expect(records.map((record) => record.title)).toEqual([
    'Observed fact',
    'Pattern',
  ])
  expect(memoryOverviewState(payload, records)).toBe('live')
})

it('does not retain raw memory payload fields in normalized client records', () => {
  const payload = {
    memories: [
      {
        id: 'm4',
        title: 'Safe title',
        kind: 'fact',
        confidence: 'high',
        content: 'RAW MEMORY BODY private episode',
        private_note: 'do not retain',
        source_uri: 'file:///home/alexeybe1kin/private/memory.json',
        raw_args: { command: 'cat /etc/passwd' },
        evidence: [
          { label: 'provider', url: 'https://api.anthropic.com/v1/messages' },
        ],
        entities: [{ name: 'owner', private_note: 'full narrative' }],
      },
    ],
  }

  const records = normalizeMemoryRecords(payload)
  const encoded = JSON.stringify(records)

  expect(encoded).not.toContain('RAW MEMORY BODY')
  expect(encoded).not.toContain('private_note')
  expect(encoded).not.toContain('raw_args')
  expect(encoded).not.toContain('/home/alexeybe1kin')
  expect(encoded).not.toContain('api.anthropic.com')
  expect(buildMemoryDetail(records[0])).toMatchObject({
    claim: 'Safe title',
    evidence: ['provider'],
    source: 'reference withheld',
    linkedEntities: ['owner'],
  })
})

it('redacts embedded provider URLs and host paths in allowed display fields', () => {
  const [record] = normalizeMemoryRecords([
    {
      id: 'm5',
      title: 'failed at https://api.anthropic.com/v1/messages',
      kind: 'fact',
      confidence: 'high',
      source: 'socket at /var/run/docker.sock',
      evidence: [{ label: 'see /etc/passwd', ref: 'sk-proj-private' }],
    },
  ])

  const encoded = JSON.stringify({ record, detail: buildMemoryDetail(record) })
  expect(encoded).not.toContain('api.anthropic.com')
  expect(encoded).not.toContain('/var/run/docker.sock')
  expect(encoded).not.toContain('/etc/passwd')
  expect(encoded).not.toContain('sk-proj-private')
  expect(record.title).toBe('reference withheld')
  expect(buildMemoryDetail(record).source).toBe('reference withheld')
})

it('redacts provider hostnames without schemes and colon-form secret markers', () => {
  const [record] = normalizeMemoryRecords([
    {
      id: 'm6',
      title: 'token: SECRET123',
      kind: 'fact',
      confidence: 'high',
      source: 'provider host api.anthropic.com/v1/messages',
      evidence: [
        {
          label: 'Authorization: Bearer SECRET123',
          ref: 'api.openai.com/v1/responses',
        },
      ],
    },
  ])

  const encoded = JSON.stringify({ record, detail: buildMemoryDetail(record) })
  expect(encoded).not.toContain('SECRET123')
  expect(encoded).not.toContain('api.anthropic.com')
  expect(encoded).not.toContain('api.openai.com')
  expect(record.title).toBe('reference withheld')
  expect(buildMemoryDetail(record).source).toBe('reference withheld')
})
