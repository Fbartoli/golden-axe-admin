'use client'

import { ReactNode } from 'react'
import { AdminProvider } from '@/components/AdminContext'
import { Toaster } from '@/components/ui'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      {children}
      <Toaster />
    </AdminProvider>
  )
}
