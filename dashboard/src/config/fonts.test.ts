import { describe, expect, it } from 'vitest'
import { fonts } from './fonts'

describe('AgentGate product typography', () => {
  it('uses locally bundled Geist as the default UI family', () => {
    expect(fonts[0]).toBe('geist')
    expect(fonts).toContain('system')
  })
})
