import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, User, Settings as SettingsIcon } from 'lucide-react';

const items = [
  { to: '/log',     icon: Home,         label: 'Home' },
  { to: '/history', icon: Calendar,     label: 'Calendar' },
  { to: '/profile', icon: User,         label: 'Profile' },
  { to: '/settings',icon: SettingsIcon, label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="h-16 w-full flex justify-around items-center border-t bg-white/95 backdrop-blur safe-bottom">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            'flex flex-col items-center gap-1 text-xs transition-colors ' +
            (isActive ? 'text-brand-800' : 'text-gray-400 hover:text-gray-600')
          }
        >
          <Icon size={22} strokeWidth={2} />
          <span className="leading-none">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
