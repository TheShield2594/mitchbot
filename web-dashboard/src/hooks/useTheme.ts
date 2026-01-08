import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) return stored

    // Default to dark theme
    return 'dark'
  })

  useEffect(() => {
    const root = document.documentElement

    // Remove both classes
    root.classList.remove('light', 'dark')

    // Add current theme
    root.classList.add(theme)

    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return {
    theme,
    toggleTheme,
    setTheme,
  }
}
