import { describe, expect, it } from 'vitest'
import {
  emptyOrDegradedCopy,
  homeAttentionCopy,
  overallHomeStatus,
  sourceStateLabel,
} from './command-home'

describe('home source-bound copy helpers', () => {
  it('labels pending approvals without hiding degraded ToolGate requests', () => {
    expect(homeAttentionCopy({ pending: 2 })).toBe('2 owner-gated actions')
    expect(
      homeAttentionCopy({
        pending: 0,
        sourceState: { status: 'degraded', source: 'toolgate' },
      })
    ).toBe('ToolGate requests degraded; pending count may be incomplete')
    expect(
      homeAttentionCopy({ pending: 0, sourceState: { status: 'live' } })
    ).toBe('empty · no pending approvals reported')
  })

  it('keeps empty, degraded, and unknown states explicit', () => {
    expect(emptyOrDegradedCopy('Recent chats', 'empty')).toBe(
      'empty · no recent chats reported.'
    )
    expect(emptyOrDegradedCopy('Jobs', 'degraded')).toBe(
      'Jobs source is degraded.'
    )
    expect(sourceStateLabel(undefined)).toBe('unknown')
  })

  it('does not report live when any source is degraded', () => {
    expect(
      overallHomeStatus({
        brain: { status: 'live' },
        toolgate: { status: 'degraded' },
      })
    ).toBe('degraded')
    expect(overallHomeStatus({ brain: { status: 'live' } })).toBe('live')
    expect(overallHomeStatus()).toBe('unknown')
  })
})
