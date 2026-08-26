import type { Approval } from './api'

export type { Approval } from './api'

export type VerificationHistory = {
  available: boolean
  status: string
  source?: string
  reason?: string
  items: Approval[]
  metadata_only?: boolean
}

export type VerificationCenter = {
  metadata_only: boolean
  pending: Approval[]
  pending_count: number
  history: VerificationHistory
  sources?: Record<
    string,
    { status: string; source?: string; message?: string }
  >
}

const unavailableReason =
  'No real source-bound approval history query contract is available.'

function unavailableHistory(reason = unavailableReason): VerificationHistory {
  return {
    available: false,
    status: 'unavailable',
    source: 'toolgate+brain',
    reason,
    items: [],
    metadata_only: true,
  }
}

function normalizeApproval(item: Partial<Approval>): Approval {
  return {
    id: String(item.id ?? item.source_id ?? 'unknown'),
    source: String(item.source ?? 'unknown'),
    source_id: String(item.source_id ?? item.id ?? 'unknown'),
    status: String(item.status ?? 'pending'),
    severity:
      item.severity === 'high' || item.severity === 'medium'
        ? item.severity
        : 'low',
    title: String(item.title ?? 'Approval required'),
    details: String(item.details ?? 'Review source-bound metadata.'),
    binding: {
      type: String(item.binding?.type ?? 'unknown'),
      id: String(item.binding?.id ?? 'unknown'),
      version: String(item.binding?.version ?? 'unknown'),
      digest: String(item.binding?.digest ?? 'reference withheld'),
    },
    action: item.action,
    created_at: String(item.created_at ?? 'unknown'),
    expires_at: item.expires_at,
    action_payload_withheld: item.action_payload_withheld ?? true,
  }
}

export function normalizeVerificationsResponse(
  payload: unknown
): VerificationCenter {
  if (Array.isArray(payload)) {
    const pending = payload
      .filter(
        (item): item is Partial<Approval> =>
          typeof item === 'object' &&
          item !== null &&
          String((item as Partial<Approval>).status ?? 'pending') === 'pending'
      )
      .map(normalizeApproval)
    return {
      metadata_only: true,
      pending,
      pending_count: pending.length,
      history: unavailableHistory(),
    }
  }

  const record =
    typeof payload === 'object' && payload !== null
      ? (payload as {
          pending?: Partial<Approval>[]
          pending_count?: number
          history?: Partial<VerificationHistory>
          sources?: VerificationCenter['sources']
          metadata_only?: boolean
        })
      : {}
  const pending = Array.isArray(record.pending)
    ? record.pending
        .filter((item) => String(item.status ?? 'pending') === 'pending')
        .map(normalizeApproval)
    : []
  const history = record.history?.available
    ? {
        available: false,
        status: 'unavailable',
        source: record.history.source,
        reason: unavailableReason,
        items: [],
        metadata_only: true,
      }
    : {
        ...unavailableHistory(record.history?.reason),
        ...record.history,
        available: false,
        items: [],
      }
  return {
    metadata_only: record.metadata_only ?? true,
    pending,
    pending_count: record.pending_count ?? pending.length,
    history,
    sources: record.sources,
  }
}

export function historyUnavailableCopy(history: VerificationHistory) {
  const reason = (history.reason ?? unavailableReason).replace(/\.$/, '')
  return `History unavailable · ${reason.charAt(0).toLowerCase()}${reason.slice(1)}.`
}

export function pendingDecisionConfirmed(
  approval: Pick<Approval, 'source' | 'source_id' | 'id'>,
  center: Pick<VerificationCenter, 'pending'>
) {
  const sourceId = approval.source_id ?? approval.id
  return !center.pending.some(
    (item) => item.source === approval.source && item.source_id === sourceId
  )
}
