import { describe, expect, it } from 'vitest'
import { capabilitySections, capabilityStatus } from './capabilities-model'

describe('capabilities model', () => {
  it('builds four source-bound sections without raw details', () => {
    const sections = capabilitySections({
      tools: [
        {
          id: 'tool',
          name: 'Tool',
          status: 'live',
          source: 'toolgate',
          kind: 'tools',
          metadata_only: true,
          details_withheld: true,
        },
      ],
      toolsets: [],
      skills: [],
      automations: [],
    })

    expect(sections.map((section) => section.id)).toEqual([
      'tools',
      'toolsets',
      'skills',
      'automations',
    ])
    expect(JSON.stringify(sections)).not.toContain('args')
    expect(JSON.stringify(sections)).not.toContain('prompt')
  })

  it('degrades overall status from source statuses', () => {
    expect(
      capabilityStatus({
        sources: { toolgate: { source: 'toolgate', status: 'degraded' } },
      })
    ).toBe('degraded')
    expect(
      capabilityStatus({
        sources: { toolgate: { source: 'toolgate', status: 'blocked' } },
      })
    ).toBe('blocked')
    expect(
      capabilityStatus({
        sources: { toolgate: { source: 'toolgate', status: 'live' } },
      })
    ).toBe('live')
  })
})

it('does not use source-bound as a status value', () => {
  expect(
    capabilityStatus({
      sources: {
        brain: { source: 'brain', status: 'live' },
        toolgate: { source: 'toolgate', status: 'live' },
      },
    })
  ).toBe('live')
})

it('collapses unexpected item statuses from API to known UI handling', () => {
  const sections = capabilitySections({
    tools: [
      {
        id: 'x',
        name: 'X',
        status: 'unknown',
        source: 'toolgate',
        kind: 'tools',
      },
    ],
  })
  expect(sections[0].items[0].status).toBe('unknown')
})

it('keeps section status separate from empty inventory', () => {
  const sections = capabilitySections({
    section_statuses: { tools: 'degraded' },
    tools: [],
  })
  expect(sections[0].status).toBe('degraded')
  expect(sections[0].items).toEqual([])
})

it('preserves offline as distinct from blocked for overall status', () => {
  expect(
    capabilityStatus({
      sources: { brain: { source: 'brain', status: 'offline' } },
    })
  ).toBe('offline')
})

it('reports partial when some capability sections are live and others are degraded', () => {
  expect(
    capabilityStatus({
      sources: {
        brain: { source: 'brain', status: 'degraded' },
        toolgate: { source: 'toolgate', status: 'degraded' },
      },
      section_statuses: {
        tools: 'live',
        toolsets: 'degraded',
        skills: 'degraded',
        automations: 'empty',
      },
    })
  ).toBe('partial')
})

it('does not downgrade blocked sections to partial', () => {
  expect(
    capabilityStatus({
      section_statuses: {
        tools: 'live',
        toolsets: 'blocked',
        skills: 'degraded',
      },
    })
  ).toBe('blocked')
})

it('does not downgrade offline sections to partial', () => {
  expect(
    capabilityStatus({
      section_statuses: {
        tools: 'live',
        toolsets: 'offline',
        skills: 'degraded',
      },
    })
  ).toBe('offline')
})
