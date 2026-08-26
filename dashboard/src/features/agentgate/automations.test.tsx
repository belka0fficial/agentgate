import { describe, expect, it } from 'vitest'
import {
  canRenderJobControls,
  jobActionsEnabled,
  jobStatus,
  isLockedSystemJob,
  normalizeJobsResponse,
  normalizeToolGateOverview,
  safeJobHistoryLabel,
} from './automations-model'

describe('Jobs and Automations helpers', () => {
  it('normalizes runtime job envelopes without raw output fields', () => {
    const jobs = normalizeJobsResponse({
      jobs: [
        {
          id: 'job-1',
          name: 'Daily review',
          status: 'running',
          schedule: '0 9 * * *',
          metadata_only: true,
          output_withheld: true,
        },
      ],
    })

    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({
      id: 'job-1',
      metadata_only: true,
      output_withheld: true,
    })
    expect(JSON.stringify(jobs)).not.toContain('prompt')
    expect(JSON.stringify(jobs)).not.toContain('stdout')
  })

  it('treats paused jobs as paused even when status is stale', () => {
    expect(jobStatus({ id: 'job-1', paused: true, status: 'running' })).toBe(
      'paused'
    )
  })

  it('identifies built-in system jobs as locked and metadata only', () => {
    const jobs = normalizeJobsResponse({
      jobs: [
        {
          id: 'system:technology-radar-global',
          owner: 'system',
          editable: false,
          kind: 'cron',
          status: 'planned',
          metadata_only: true,
          output: { status: 'planned', raw_withheld: true },
          history: {
            status: 'unavailable',
            reason: 'Pi flow history contract not available',
          },
        },
        { id: 'owner-job', owner: 'user', editable: true, status: 'running' },
      ],
    })

    expect(isLockedSystemJob(jobs[0])).toBe(true)
    expect(jobActionsEnabled(jobs[0])).toBe(false)
    expect(canRenderJobControls(jobs[0])).toBe(false)
    expect(jobActionsEnabled(jobs[1])).toBe(true)
    expect(canRenderJobControls(jobs[1])).toBe(true)
    expect(safeJobHistoryLabel(jobs[0])).toBe('History unavailable')
    expect(JSON.stringify(jobs)).not.toContain('stdout')
    expect(JSON.stringify(jobs)).not.toContain('tool_args')
  })
})

it('normalizes ToolGate overview into safe catalog, automation, event and approval summaries', () => {
  const overview = normalizeToolGateOverview({
    source_status: {
      status: { status: 'degraded', source: 'toolgate' },
      tools: { status: 'unknown', source: 'toolgate' },
      automations: { status: 'live', source: 'toolgate' },
      events: { status: 'stale', source: 'toolgate' },
    },
    tools: [
      {
        id: 'shell',
        name: 'Shell',
        status: 'connected',
        args: { command: 'cat /etc/passwd' },
      },
    ],
    automations: [
      {
        id: 'auto-1',
        status: 'planned',
        schedule: 'manual',
        requires_approval: true,
        approval_request_id: 'approve-1',
      },
    ],
    events: [
      {
        id: 'evt-1',
        kind: 'approval_requested',
        status: 'pending',
        args_digest: 'digest',
      },
    ],
  })

  expect(overview.sources.map((source) => source.status)).toEqual([
    'degraded',
    'unknown',
    'live',
    'stale',
  ])
  expect(overview.tools[0]).toEqual({
    id: 'tools-0',
    name: 'Shell',
    status: 'unknown',
    source: 'toolgate',
    kind: 'tools',
    metadata_only: true,
    details_withheld: true,
  })
  expect(overview.automations[0].approvalHref).toBe(
    '/approvals?source_id=approve-1'
  )
  expect(overview.automations[0].actionsEnabled).toBe(false)
  expect(overview.events[0].args_digest).toBe('digest')
  expect(JSON.stringify(overview)).not.toContain('cat /etc/passwd')
  expect(JSON.stringify(overview)).not.toContain('private')
  expect(JSON.stringify(overview)).not.toContain('cat /etc/passwd')
})
