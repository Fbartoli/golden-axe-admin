import { useState, useEffect, useMemo } from 'react'
import { getColors, getStyles } from '@/styles/theme'

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = localStorage.getItem('darkMode')
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode((d: boolean) => !d)

  // Memoize colors and styles
  const colors = useMemo(() => getColors(darkMode), [darkMode])
  const styles = useMemo(() => getStyles(colors, darkMode), [colors, darkMode])

  return { darkMode, setDarkMode, toggleDarkMode, colors, styles }
}
