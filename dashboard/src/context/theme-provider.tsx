import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import {
  ALLOWED_THEME_KEYS,
  sanitizeThemeTokens,
  type ThemeTokens,
} from '@/lib/theme-import'

type Theme = 'dark' | 'light' | 'system'
type ResolvedTheme = Exclude<Theme, 'system'>

const DEFAULT_THEME = 'dark'
const THEME_COOKIE_NAME = 'vite-ui-theme'
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year
const CUSTOM_THEME_STORAGE_KEY = 'agentgate-custom-theme'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  defaultTheme: Theme
  resolvedTheme: ResolvedTheme
  theme: Theme
  setTheme: (theme: Theme) => void
  resetTheme: () => void
  customTheme: ThemeTokens | null
  setCustomTheme: (tokens: ThemeTokens) => void
  previewCustomTheme: (tokens: ThemeTokens) => void
  resetCustomTheme: () => void
}

const initialState: ThemeProviderState = {
  defaultTheme: DEFAULT_THEME,
  resolvedTheme: 'dark',
  theme: DEFAULT_THEME,
  setTheme: () => null,
  resetTheme: () => null,
  customTheme: null,
  setCustomTheme: () => null,
  previewCustomTheme: () => null,
  resetCustomTheme: () => null,
}

const ThemeContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  storageKey = THEME_COOKIE_NAME,
  ...props
}: ThemeProviderProps) {
  const [theme, _setTheme] = useState<Theme>(
    () => (getCookie(storageKey) as Theme) || defaultTheme
  )
  const [customTheme, _setCustomTheme] = useState<ThemeTokens | null>(() => {
    try {
      const saved = window.localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)
      return saved ? sanitizeThemeTokens(JSON.parse(saved)) : null
    } catch {
      return null
    }
  })
  const [previewTheme, setPreviewTheme] = useState<ThemeTokens | null>(null)

  // Optimized: Memoize the resolved theme calculation to prevent unnecessary re-computations
  const resolvedTheme = useMemo((): ResolvedTheme => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }
    return theme as ResolvedTheme
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = (currentResolvedTheme: ResolvedTheme) => {
      root.classList.remove('light', 'dark') // Remove existing theme classes
      root.classList.add(currentResolvedTheme) // Add the new theme class
    }

    const applyCustomTheme = (currentResolvedTheme: ResolvedTheme) => {
      for (const key of ALLOWED_THEME_KEYS)
        root.style.removeProperty(`--${key}`)
      for (const [key, value] of Object.entries(
        (previewTheme ?? customTheme)?.[currentResolvedTheme] ?? {}
      )) {
        if (ALLOWED_THEME_KEYS.has(key))
          root.style.setProperty(`--${key}`, value)
      }
    }

    const handleChange = () => {
      if (theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light'
        applyTheme(systemTheme)
        applyCustomTheme(systemTheme)
      }
    }

    applyTheme(resolvedTheme)
    applyCustomTheme(resolvedTheme)

    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, resolvedTheme, customTheme, previewTheme])

  const setTheme = (theme: Theme) => {
    setCookie(storageKey, theme, THEME_COOKIE_MAX_AGE)
    _setTheme(theme)
  }

  const resetTheme = () => {
    removeCookie(storageKey)
    _setTheme(DEFAULT_THEME)
  }

  const setCustomTheme = (tokens: ThemeTokens) => {
    const safeTokens = sanitizeThemeTokens(tokens)
    window.localStorage.setItem(
      CUSTOM_THEME_STORAGE_KEY,
      JSON.stringify(safeTokens)
    )
    _setCustomTheme(safeTokens)
    setPreviewTheme(null)
  }

  const previewCustomTheme = (tokens: ThemeTokens) => {
    setPreviewTheme(sanitizeThemeTokens(tokens))
  }

  const resetCustomTheme = () => {
    window.localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY)
    _setCustomTheme(null)
    setPreviewTheme(null)
  }

  const contextValue = {
    defaultTheme,
    resolvedTheme,
    resetTheme,
    theme,
    setTheme,
    customTheme,
    setCustomTheme,
    previewCustomTheme,
    resetCustomTheme,
  }

  return (
    <ThemeContext value={contextValue} {...props}>
      {children}
    </ThemeContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext)

  if (!context) throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
