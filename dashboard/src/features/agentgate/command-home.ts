export type SourceState = {
  status:
    | 'live'
    | 'degraded'
    | 'offline'
    | 'stale'
    | 'blocked'
    | 'empty'
    | 'planned'
    | 'unknown'
    | string
  source?: string
  detail?: unknown
}

export type HomeEmptyStates = Record<string, SourceState['status']>

export function sourceStateLabel(state?: SourceState): string {
  if (!state) return 'unknown'
  return state.status || 'unknown'
}

export function homeAttentionCopy(args: {
  pending: number
  sourceState?: SourceState
}): string {
  if (args.pending > 0) {
    return `${args.pending} owner-gated action${args.pending === 1 ? '' : 's'}`
  }
  if (args.sourceState?.status === 'degraded') {
    return 'ToolGate requests degraded; pending count may be incomplete'
  }
  return 'empty · no pending approvals reported'
}

export function emptyOrDegradedCopy(label: string, state?: string): string {
  if (state === 'degraded') return `${label} source is degraded.`
  if (state === 'blocked') return `${label} source is blocked.`
  if (state === 'empty') return `empty · no ${label.toLowerCase()} reported.`
  if (state === 'unknown') return `${label} status unknown.`
  return ''
}

export function overallHomeStatus(
  states?: Record<string, SourceState>
): SourceState['status'] {
  if (!states || Object.keys(states).length === 0) return 'unknown'
  if (
    Object.values(states).some(
      (state) =>
        state.status === 'degraded' ||
        state.status === 'offline' ||
        state.status === 'blocked'
    )
  ) {
    return 'degraded'
  }
  if (Object.values(states).every((state) => state.status === 'live'))
    return 'live'
  return 'unknown'
}
