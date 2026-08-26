import { describe, expect, it } from 'vitest'
import { jobStatus, normalizeJobsResponse } from './automations-model'

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
})
