import { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'

export type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useKV<Theme>('theme-preference', 'dark')
  const currentTheme = theme || 'dark'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme)
  }, [currentTheme])

  const toggleTheme = () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark')
  }

  return { theme: currentTheme, toggleTheme }
}
