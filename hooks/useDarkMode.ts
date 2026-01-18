import { useState, useEffect } from 'react'

export function useDarkMode() {
  // Default to dark mode (Horusblock brand)
  const [darkMode, setDarkMode] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  // Read from localStorage after hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem('darkMode')
      if (saved !== null) {
        setDarkMode(saved === 'true')
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsHydrated(true)
  }, [])

  // Save preference to localStorage and update document class
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('darkMode', String(darkMode))
      document.documentElement.classList.toggle('light', !darkMode)
    }
  }, [darkMode, isHydrated])

  const toggleDarkMode = () => setDarkMode(d => !d)

  return { darkMode, setDarkMode, toggleDarkMode }
}
