import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, User, Settings as SettingsIcon, BookOpen } from 'lucide-react';

const items = [
  { to: '/log',     icon: Home,         label: 'Home' },
  { to: '/rituals', icon: BookOpen,     label: 'Rituals' },
  { to: '/history', icon: Calendar,     label: 'Calendar' },
  { to: '/profile', icon: User,         label: 'Profile' },
  { to: '/settings',icon: SettingsIcon, label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 dark:bg-neutral-950/90 backdrop-blur border-neutral-200 dark:border-neutral-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="mx-auto max-w-[560px] h-16 w-full flex justify-around items-center">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex flex-col items-center gap-1 text-xs transition-colors',
                isActive
                  ? 'text-brand-700 dark:text-brand-400'
                  : 'text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300',
              ].join(' ')
            }
          >
            <Icon size={22} strokeWidth={2} />
            <span className="leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
