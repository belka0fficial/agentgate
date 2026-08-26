import { describe, expect, it } from 'vitest'
import {
  jobActionsEnabled,
  jobStatus,
  isLockedSystemJob,
  normalizeJobsResponse,
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
    expect(jobActionsEnabled(jobs[1])).toBe(true)
    expect(safeJobHistoryLabel(jobs[0])).toBe('History unavailable')
    expect(JSON.stringify(jobs)).not.toContain('stdout')
    expect(JSON.stringify(jobs)).not.toContain('tool_args')
  })
})
