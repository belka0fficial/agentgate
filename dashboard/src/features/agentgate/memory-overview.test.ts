import { describe, expect, it } from 'vitest'
import {
  buildMemoryDetail,
  memoryOverviewErrors,
  memoryOverviewState,
  memorySectionSummaries,
  normalizeMemoryRecords,
} from './memory-overview'

describe('memory overview normalization', () => {
  it('renders MemoryGate supplied source fields without inventing evidence chains', () => {
    const [record] = normalizeMemoryRecords([
      {
        id: 'memory-1',
        title: 'Memory record 1',
        kind: 'preference',
        confidence: 'high',
        updated_at: '2030-01-02T00:00:00Z',
        source: 'session',
        evidence: [{ label: 'chat', ref: 's1' }],
      },
    ])

    expect(record).toMatchObject({
      id: 'memory-1',
      state: 'fact',
      title: 'Memory record 1',
    })
    expect(buildMemoryDetail(record).evidence).toEqual([
      '1 evidence references; details withheld.',
    ])
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
      'Evidence details withheld by MemoryGate.',
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
  expect(detail.evidence).toEqual(['2 evidence references; details withheld.'])
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
    'Memory record 1',
    'Memory record 2',
  ])
  expect(memoryOverviewState(payload, records)).toBe('live')
})

it('does not retain raw memory payload fields in normalized client records', () => {
  const payload = {
    memories: [
      {
        id: 'm4',
        title: 'Memory record 1',
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
    claim: 'Memory record 1',
    evidence: ['1 evidence references; details withheld.'],
    source: 'reference withheld',
    linkedEntities: [],
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
  expect(record.title).toBe('Memory record 1')
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
  expect(record.title).toBe('Memory record 1')
  expect(buildMemoryDetail(record).source).toBe('reference withheld')
})

it('builds metadata-only section summaries without raw memory bodies', () => {
  const payload = {
    briefing: { available: true, metadata_only: true, content_withheld: true },
    memories: [
      {
        id: 'fact-1',
        title: 'Fact metadata',
        kind: 'fact',
        confidence: 'high',
        content: 'RAW MEMORY BODY should not render',
        evidence: [{ label: 'episode', ref: 'ep-1' }],
      },
    ],
    observations: [{ id: 'ctx-1', title: 'Context signal', kind: 'context' }],
    patterns: [{ id: 'watch-1', title: 'Watch item', kind: 'watch' }],
    source_status: {
      memories: { status: 'stale', source: 'memorygate' },
      observations: { status: 'empty', source: 'memorygate' },
    },
  }

  const summaries = memorySectionSummaries(payload)
  expect(summaries).toEqual([
    {
      id: 'facts',
      title: 'Facts',
      status: 'stale',
      count: 1,
      source: 'memorygate',
      detail: '1 fact records · metadata only',
    },
    {
      id: 'theories',
      title: 'Theories',
      status: 'stale',
      count: 0,
      source: 'memorygate',
      detail: 'No theory records returned by MemoryGate overview.',
    },
    {
      id: 'context',
      title: 'Context',
      status: 'empty',
      count: 1,
      source: 'memorygate',
      detail: '1 context records · metadata only',
    },
    {
      id: 'watch',
      title: 'Watch items',
      status: 'unknown',
      count: 1,
      source: 'memorygate',
      detail: '1 watch records · metadata only',
    },
    {
      id: 'evidence',
      title: 'Evidence lineage',
      status: 'stale',
      count: 1,
      source: 'memorygate',
      detail: '1 evidence references · raw evidence withheld',
    },
    {
      id: 'search',
      title: 'Search contract',
      status: 'planned',
      count: 0,
      source: 'memorygate',
      detail:
        'Search route available: POST /api/gates/memorygate/search returns sanitized metadata only.',
    },
  ])
  expect(JSON.stringify(summaries)).not.toContain('RAW MEMORY BODY')
})

it('does not infer MemoryGate live status from rows when source says unknown', () => {
  const summaries = memorySectionSummaries({
    memories: [{ id: 'm1', title: 'Metadata only', kind: 'fact' }],
    source_status: { memories: { status: 'unknown', source: 'memorygate' } },
  })

  expect(summaries[0].status).toBe('unknown')
  expect(
    memoryOverviewState(
      {
        source_status: { memories: { status: 'unknown' } },
        memories: [{ id: 'm1' }],
      },
      normalizeMemoryRecords({ memories: [{ id: 'm1' }] })
    )
  ).toBe('unknown')
})
