export const ALLOWED_THEME_KEYS = new Set([
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  'font-sans',
  'font-serif',
  'font-mono',
  'radius',
  'spacing',
  'tracking-normal',
  'shadow-2xs',
  'shadow-xs',
  'shadow-sm',
  'shadow',
  'shadow-md',
  'shadow-lg',
  'shadow-xl',
  'shadow-2xl',
])

export type ThemeTokens = {
  light: Record<string, string>
  dark: Record<string, string>
}

const emptyTokens = (): ThemeTokens => ({ light: {}, dark: {} })

function safeValue(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 500) return null
  if (/[\\{}<>;:@]/.test(trimmed)) return null
  const withoutSafeFunctions = trimmed.replace(
    /\b(?:oklch|hsl|hsla|rgb|rgba|color-mix)\([^()]*\)/gi,
    ''
  )
  if (/[a-z-]+\s*\(/i.test(withoutSafeFunctions)) return null
  if (!/^[#A-Za-z0-9_.,% /()+*'"-]+$/.test(trimmed)) return null
  return trimmed
}

function addToken(
  target: Record<string, string>,
  key: unknown,
  value: unknown
) {
  const normalized = typeof key === 'string' ? key.replace(/^--/, '') : ''
  const safe = safeValue(value)
  if (ALLOWED_THEME_KEYS.has(normalized) && safe) target[normalized] = safe
}

function readObject(value: unknown, target: Record<string, string>) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  for (const [key, entry] of Object.entries(value)) addToken(target, key, entry)
}

function parseJson(input: string): ThemeTokens | null {
  try {
    const parsed = JSON.parse(input) as Record<string, unknown>
    const result = emptyTokens()
    const cssVars = parsed.cssVars as Record<string, unknown> | undefined
    const source = cssVars ?? parsed
    readObject(source.theme, result.light)
    readObject(source.light, result.light)
    readObject(source.dark, result.dark)
    if (!Object.keys(result.light).length && !Object.keys(result.dark).length) {
      readObject(source, result.light)
    }
    return Object.keys(result.light).length || Object.keys(result.dark).length
      ? result
      : null
  } catch {
    return null
  }
}

function parseCss(input: string): ThemeTokens {
  const result = emptyTokens()
  const block = /([^{}]+)\{([^{}]*)\}/g
  let match: RegExpExecArray | null
  while ((match = block.exec(input))) {
    const selector = match[1].trim()
    const target = selector.includes('.dark')
      ? result.dark
      : selector.includes(':root')
        ? result.light
        : null
    if (!target) continue
    for (const token of match[2].matchAll(/--([\w-]+)\s*:\s*([^;\n]+)/g))
      addToken(target, token[1], token[2])
  }
  for (const token of input.matchAll(
    /['"](--[\w-]+)['"]\s*:\s*['"]([^'"]+)['"]/g
  ))
    addToken(result.light, token[1], token[2])
  return result
}

export function sanitizeThemeTokens(input: unknown): ThemeTokens {
  const result = emptyTokens()
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result
  const source = input as { light?: unknown; dark?: unknown }
  readObject(source.light, result.light)
  readObject(source.dark, result.dark)
  return result
}

export function parseThemeInput(input: string): ThemeTokens {
  const json = parseJson(input.trim())
  if (json) return json
  return parseCss(input)
}

export function tokenCount(tokens: ThemeTokens) {
  return new Set([...Object.keys(tokens.light), ...Object.keys(tokens.dark)])
    .size
}
