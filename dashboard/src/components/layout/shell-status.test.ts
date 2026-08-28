import { describe, expect, it } from 'vitest'
import { deriveShellStatus } from './shell-status'

describe('deriveShellStatus', () => {
  it('labels pending system discovery without pretending health', () => {
    expect(deriveShellStatus({ isPending: true, isError: false })).toEqual({
      label: 'Checking system',
      tone: 'pending',
    })
  })

  it('labels failed system discovery as unavailable', () => {
    expect(deriveShellStatus({ isPending: false, isError: true })).toEqual({
      label: 'System unavailable',
      tone: 'unavailable',
    })
  })

  it('labels a source response as available without claiming health', () => {
    expect(
      deriveShellStatus({ isPending: false, isError: false, hasData: true })
    ).toEqual({ label: 'System data available', tone: 'available' })
  })

  it('keeps an empty response explicitly unknown', () => {
    expect(
      deriveShellStatus({ isPending: false, isError: false, hasData: false })
    ).toEqual({ label: 'System status unknown', tone: 'unknown' })
  })
})
