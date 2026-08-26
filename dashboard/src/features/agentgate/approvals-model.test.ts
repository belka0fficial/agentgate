import { describe, expect, it } from 'vitest'
import {
  historyUnavailableCopy,
  normalizeVerificationsResponse,
  pendingDecisionConfirmed,
  type Approval,
} from './approvals-model'

describe('Verifications center helpers', () => {
  it('normalizes source-bound pending rows and explicit unavailable history', () => {
    const center = normalizeVerificationsResponse({
      metadata_only: true,
      pending: [
        {
          id: 'req-1',
          source: 'toolgate',
          source_id: 'req-1',
          status: 'pending',
          severity: 'high',
          title: 'Send digest',
          details: 'Metadata only',
          binding: {
            type: 'tool',
            id: 'mail.send',
            version: 'v1',
            digest: 'sha256:abc',
          },
          action: { binding: { args_digest: 'sha256:abc' } },
          expires_at: '2030-01-01T00:00:00Z',
          created_at: '2029-01-01T00:00:00Z',
          action_payload_withheld: true,
        },
      ],
      history: {
        available: false,
        status: 'unavailable',
        reason:
          'No real source-bound approval history query contract is available.',
        items: [],
      },
    })

    expect(center.pending).toHaveLength(1)
    expect(center.pending[0]).toMatchObject({
      id: 'req-1',
      source: 'toolgate',
      source_id: 'req-1',
      severity: 'high',
      expires_at: '2030-01-01T00:00:00Z',
      action_payload_withheld: true,
    })
    expect(center.history.available).toBe(false)
    expect(historyUnavailableCopy(center.history)).toBe(
      'History unavailable · no real source-bound approval history query contract is available.'
    )
  })

  it('does not accept retained history from legacy arrays', () => {
    const center = normalizeVerificationsResponse([
      { id: 'pending', source: 'brain', status: 'pending', title: 'Pending' },
      {
        id: 'approved',
        source: 'brain',
        status: 'approved',
        title: 'Fake old row',
      },
    ])

    expect(center.pending.map((row) => row.id)).toEqual(['pending'])
    expect(center.history.available).toBe(false)
    expect(center.history.items).toEqual([])
  })

  it('confirms decisions only when read-back no longer shows the pending source/id', () => {
    const approval: Approval = {
      id: 'tg/live id',
      source: 'toolgate',
      source_id: 'tg/live id',
      status: 'pending',
      severity: 'medium',
      title: 'Approve me',
      details: 'Safe',
      binding: {
        type: 'tool',
        id: 'tool',
        version: 'v1',
        digest: 'sha256:abc',
      },
      created_at: '2029-01-01T00:00:00Z',
    }

    expect(pendingDecisionConfirmed(approval, { pending: [] })).toBe(true)
    expect(pendingDecisionConfirmed(approval, { pending: [approval] })).toBe(
      false
    )
  })
})
