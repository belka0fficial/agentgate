export type GatewayStatus =
  | 'live'
  | 'degraded'
  | 'offline'
  | 'stale'
  | 'blocked'
  | 'empty'
  | 'planned'
  | 'unknown'

export type GatewayRow = {
  name: string
  role: string
  channel: string
  status: GatewayStatus
}

export type GatewayOverviewInput = {
  healthStatus?: string
  ownerAuthenticated?: boolean
  providerStatus?: string
  memorygateStatus?: GatewayStatus
  toolgateStatus?: GatewayStatus
  systemgateStatus?: GatewayStatus
}

function piStatus(status?: string): GatewayStatus {
  if (status === 'ok' || status === 'live') return 'live'
  if (status === 'degraded') return 'degraded'
  if (status === 'offline') return 'offline'
  if (status === 'blocked' || status === 'auth_required') return 'blocked'
  return 'unknown'
}

function modelStatus(status?: string): GatewayStatus {
  if (status === 'ok' || status === 'live') return 'live'
  if (status === 'auth_required' || status === 'blocked') return 'blocked'
  if (status === 'degraded') return 'degraded'
  if (status === 'offline') return 'offline'
  return 'unknown'
}

export function buildGatewayRows(input: GatewayOverviewInput): GatewayRow[] {
  return [
    {
      name: 'AgentGate UI',
      role: 'Owner settings and control plane',
      channel: 'same-origin browser calls',
      status: input.ownerAuthenticated ? 'live' : 'blocked',
    },
    {
      name: 'Pi adapter',
      role: 'Runtime facade and owner-auth boundary',
      channel: '/api/* + /health through backend facade',
      status: piStatus(input.healthStatus),
    },
    {
      name: 'MemoryGate',
      role: 'Scoped context and evidence memory',
      channel: 'Pi adapter gate client',
      status: input.memorygateStatus ?? 'unknown',
    },
    {
      name: 'ToolGate',
      role: 'Tool execution policy, approvals, audit',
      channel: 'Pi adapter gate client',
      status: input.toolgateStatus ?? 'unknown',
    },
    {
      name: 'SystemGate',
      role: 'Read-only host telemetry',
      channel: 'Pi adapter gate client',
      status: input.systemgateStatus ?? 'unknown',
    },
    {
      name: 'Model gateway',
      role: 'Provider/model route metadata',
      channel: 'Pi adapter provider metadata',
      status: modelStatus(input.providerStatus),
    },
  ]
}

export function gatewayBadgeVariant(status: GatewayStatus) {
  if (status === 'live') return 'secondary'
  if (status === 'degraded' || status === 'offline' || status === 'blocked')
    return 'destructive'
  return 'outline'
}

export function dependencyStatus(status?: string): GatewayStatus {
  if (status === 'ok' || status === 'live') return 'live'
  if (status === 'degraded') return 'degraded'
  if (status === 'offline' || status === 'unreachable') return 'offline'
  if (status === 'blocked' || status === 'auth_required') return 'blocked'
  if (status === 'empty' || status === 'planned' || status === 'stale')
    return status
  return 'unknown'
}
