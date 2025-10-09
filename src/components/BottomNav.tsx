// src/components/BottomNav.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Calendar, User, Settings as SettingsIcon, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function BottomNav() {
  const { t } = useTranslation("common");

  const items = [
    { to: "/log",     icon: Home,         label: t("nav.home", "Home") },
    { to: "/rituals", icon: BookOpen,     label: t("nav.rituals", "Rituals") },
    { to: "/history", icon: Calendar,     label: t("nav.history", "Calendar") },
    { to: "/profile", icon: User,         label: t("nav.profile", "Profile") },
    { to: "/settings",icon: SettingsIcon, label: t("nav.settings", "Settings") },
  ] as const;

  return (
    <nav
      className="bottom-nav fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur safe-bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t("a11y.primaryNav", "Primary navigation")}
    >
      <div className="mx-auto max-w-[560px] h-16 w-full flex justify-around items-center">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              "nav-link flex flex-col items-center gap-1 text-xs transition-colors" +
              (isActive ? " active" : "")
            }
            aria-label={label}
            title={label}
          >
            <span className="nav-ico">
              <Icon size={22} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
