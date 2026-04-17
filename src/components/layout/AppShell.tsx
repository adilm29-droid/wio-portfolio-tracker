'use client'

import { useState, useCallback } from 'react'
import { Sidebar, MobileNav } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await fetch('/api/refresh-prices', { method: 'POST' })
      setLastRefresh(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('Refresh failed', e)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastRefresh={lastRefresh}
      />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 animate-fade-in">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
