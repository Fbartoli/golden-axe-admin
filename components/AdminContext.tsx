'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AdminContextType {
  darkMode: boolean
  toggleDarkMode: () => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  // Default to dark mode (Horusblock brand is dark-first)
  const [darkMode, setDarkMode] = useState(true)

  // Sync with document class on mount and changes
  useEffect(() => {
    // Check for stored preference or system preference
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) {
      const isDark = stored === 'true'
      setDarkMode(isDark)
      document.documentElement.classList.toggle('light', !isDark)
    } else {
      // Default to dark mode
      document.documentElement.classList.remove('light')
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('darkMode', String(newMode))
    document.documentElement.classList.toggle('light', !newMode)
  }

  return (
    <AdminContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider')
  }
  return context
}
