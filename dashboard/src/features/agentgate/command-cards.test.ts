import { describe, expect, it } from 'vitest'
import { buildCommandStatCards } from './command-cards'

describe('buildCommandStatCards', () => {
  it('does not invent histories or free-space notes when SystemGate only reports point-in-time vitals', () => {
    const cards = buildCommandStatCards({
      vitals: {
        cpu_percent: 12,
        cpu_count: 8,
        memory: { percent: 41 },
        disk: { percent: 59 },
      },
    })

    expect(cards).toEqual([
      { title: 'CPU', value: '12%', note: '8 cores · current sample' },
      { title: 'Memory', value: '41%', note: 'current sample' },
      { title: 'Disk', value: '59%', note: 'current sample' },
    ])
    expect(cards.every((card) => !('history' in card))).toBe(true)
  })

  it('returns unknown-state cards without live-looking values when vitals are unavailable', () => {
    const cards = buildCommandStatCards(undefined)

    expect(cards).toEqual([
      { title: 'CPU', value: 'unknown', note: 'SystemGate unavailable' },
      { title: 'Memory', value: 'unknown', note: 'SystemGate unavailable' },
      { title: 'Disk', value: 'unknown', note: 'SystemGate unavailable' },
    ])
  })
})
