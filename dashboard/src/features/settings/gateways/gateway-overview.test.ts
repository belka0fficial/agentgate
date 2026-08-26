import { describe, expect, it } from 'vitest'
import {
  buildGatewayRows,
  dependencyStatus,
  gatewayBadgeVariant,
} from './gateway-overview'

describe('buildGatewayRows', () => {
  it('uses allowed state language and derives non-local gates from source payload availability', () => {
    expect(
      buildGatewayRows({
        healthStatus: 'ok',
        ownerAuthenticated: true,
        providerStatus: 'auth_required',
      }).map((row) => [row.name, row.status])
    ).toEqual([
      ['AgentGate UI', 'live'],
      ['Pi adapter', 'live'],
      ['MemoryGate', 'unknown'],
      ['ToolGate', 'unknown'],
      ['SystemGate', 'unknown'],
      ['Model gateway', 'blocked'],
    ])
  })
})

it('does not treat connected as verified live and styles from status', () => {
  const rows = buildGatewayRows({
    healthStatus: 'connected',
    ownerAuthenticated: false,
    providerStatus: 'connected',
  })

  expect(
    rows.map((row) => [row.name, row.status, gatewayBadgeVariant(row.status)])
  ).toEqual([
    ['AgentGate UI', 'blocked', 'destructive'],
    ['Pi adapter', 'unknown', 'outline'],
    ['MemoryGate', 'unknown', 'outline'],
    ['ToolGate', 'unknown', 'outline'],
    ['SystemGate', 'unknown', 'outline'],
    ['Model gateway', 'unknown', 'outline'],
  ])
})

it('maps dependency health statuses into canonical gate row states', () => {
  expect(dependencyStatus('online')).toBe('unknown')
  expect(dependencyStatus('offline')).toBe('offline')
  expect(dependencyStatus('auth_required')).toBe('blocked')
  expect(dependencyStatus('connected')).toBe('unknown')

  expect(
    buildGatewayRows({
      healthStatus: 'ok',
      ownerAuthenticated: true,
      providerStatus: 'ok',
      memorygateStatus: dependencyStatus('online'),
      toolgateStatus: dependencyStatus('offline'),
      systemgateStatus: dependencyStatus('degraded'),
    }).map((row) => [row.name, row.status])
  ).toEqual([
    ['AgentGate UI', 'live'],
    ['Pi adapter', 'live'],
    ['MemoryGate', 'unknown'],
    ['ToolGate', 'offline'],
    ['SystemGate', 'degraded'],
    ['Model gateway', 'live'],
  ])
})
