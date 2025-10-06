import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Calendar, User, Settings as SettingsIcon, BookOpen } from 'lucide-react'

type Item = { to: string; icon: React.ComponentType<any>; label: string }

const items: Item[] = [
  { to: '/log',      icon: Home,         label: 'Home' },
  { to: '/rituals',  icon: BookOpen,     label: 'Rituals' },   // 🔥 new entry
  { to: '/history',  icon: Calendar,     label: 'Calendar' },
  { to: '/profile',  icon: User,         label: 'Profile' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
      role="navigation"
    >
      <div className="mx-auto max-w-[560px] h-16 w-full grid grid-cols-5">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex flex-col items-center justify-center gap-1 text-xs transition-colors',
                'select-none touch-manipulation',
                'aria-[current=page]:text-brand-800',
                isActive ? 'text-brand-800' : 'text-gray-400 hover:text-gray-600',
              ].join(' ')
            }
            aria-label={label}
          >
            <Icon size={22} strokeWidth={2} aria-hidden="true" />
            <span className="leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
