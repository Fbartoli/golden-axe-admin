'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Colors, Styles } from '@/styles/theme'

interface AdminContextValue {
  darkMode: boolean
  toggleDarkMode: () => void
  colors: Colors
  styles: Styles
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const { darkMode, toggleDarkMode, colors, styles } = useDarkMode()

  return (
    <AdminContext.Provider value={{ darkMode, toggleDarkMode, colors, styles }}>
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
