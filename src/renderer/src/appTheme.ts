import { useEffect } from 'react'
import type { AppTheme } from '@shared/types'

const STORAGE_KEY = 'lv-app-theme'
const darkQuery = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)')

function apply(theme: AppTheme): void {
  const dark = theme === 'dark' || (theme === 'system' && darkQuery().matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

/** Applies the last used theme before the settings load, so the app does not flash the wrong colors. */
export function applySavedAppTheme(): void {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable; the settings will set the theme once they load.
  }
  apply(saved === 'light' || saved === 'system' ? saved : 'dark')
}

/** Keeps the page's colors in step with the app theme, and with the computer when it is 'system'. */
export function useAppTheme(theme: AppTheme | undefined): void {
  useEffect(() => {
    if (!theme) return
    apply(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Only used to avoid a flash at startup.
    }
    if (theme !== 'system') return
    const query = darkQuery()
    const onChange = (): void => apply('system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [theme])
}
