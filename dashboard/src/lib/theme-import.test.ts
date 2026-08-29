import { describe, expect, it } from 'vitest'
import {
  parseThemeInput,
  sanitizeThemeTokens,
  tokenCount,
} from './theme-import'

describe('theme import', () => {
  it('reads tweakcn cssVars light and dark tokens', () => {
    const tokens = parseThemeInput(
      JSON.stringify({
        cssVars: {
          light: { primary: 'oklch(0.5 0.2 140)' },
          dark: { primary: 'oklch(0.7 0.2 140)' },
        },
      })
    )
    expect(tokens.light.primary).toBe('oklch(0.5 0.2 140)')
    expect(tokens.dark.primary).toBe('oklch(0.7 0.2 140)')
    expect(tokenCount(tokens)).toBe(1)
  })

  it('reads root and dark CSS variable blocks', () => {
    const tokens = parseThemeInput(
      ':root { --primary: #50a8ff; --radius: 0.5rem; } .dark { --primary: #8cc8ff; }'
    )
    expect(tokens.light.primary).toBe('#50a8ff')
    expect(tokens.light.radius).toBe('0.5rem')
    expect(tokens.dark.primary).toBe('#8cc8ff')
  })

  it('extracts supported token literals from layout code and rejects unsafe values', () => {
    const tokens = parseThemeInput(
      "const theme = { '--accent': '#00ca52', '--background': 'url(https://bad)' }"
    )
    expect(tokens.light.accent).toBe('#00ca52')
    expect(tokens.light.background).toBeUndefined()
  })
})

it('sanitizes persisted token objects before application', () => {
  const safe = sanitizeThemeTokens({
    light: { primary: '#22c55e', background: 'url(https://bad)' },
    dark: { accent: 'javascript:bad' },
  })
  expect(safe.light.primary).toBe('#22c55e')
  expect(safe.light.background).toBeUndefined()
  expect(safe.dark.accent).toBeUndefined()
})

it('rejects escaped and arbitrary CSS functions in imported values', () => {
  const safe = sanitizeThemeTokens({
    light: { primary: '\\75 rl(foo)', accent: 'foo(bar)' },
  })
  expect(safe.light.primary).toBeUndefined()
  expect(safe.light.accent).toBeUndefined()
})
