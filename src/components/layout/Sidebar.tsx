'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Briefcase, Calendar, Settings, Menu, ChevronRight, RefreshCw, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/today', label: "Today's Action", icon: Zap },
  { href: '/holdings', label: 'Holdings', icon: Briefcase },
  { href: '/earnings', label: 'Earnings', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  lastRefresh?: string | null
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function Sidebar({ lastRefresh, onRefresh, isRefreshing }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      'hidden md:flex flex-col bg-zinc-950 border-r border-zinc-800 transition-all duration-300 shrink-0',
      collapsed ? 'w-16' : 'w-60'
    )}>
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        {!collapsed && (
          <div>
            <p className="text-xs text-zinc-500 font-medium">WIO PORTFOLIO</p>
            <p className="text-sm font-bold text-white">Tracker</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors',
            'text-zinc-400 hover:text-white hover:bg-zinc-800',
            isRefreshing && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RefreshCw size={14} className={cn('shrink-0', isRefreshing && 'animate-spin')} />
          {!collapsed && (
            <div className="text-left">
              <p>Refresh Prices</p>
              {lastRefresh && <p className="text-zinc-600 text-xs">{lastRefresh}</p>}
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 z-50">
      <div className="grid grid-cols-5 h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                active ? 'text-blue-400' : 'text-zinc-500'
              )}
            >
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
