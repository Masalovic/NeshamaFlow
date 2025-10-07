// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom';
import { applyTheme, bindSystemThemeReactivity, loadTheme } from './lib/theme';

import ErrorBoundary from './components/ErrorBoundary';
import Protected from './components/Protected';
import AuthScreen from './pages/AuthScreen';
import Profile from './pages/Profile';
import MoodLog from './pages/MoodLog';
import RitualSuggestion from './pages/RitualSuggestion';
import RitualPlayer from './pages/RitualPlayer';
import RitualLibrary from './pages/RitualLibrary';
import RitualDone from './pages/RitualDone';
import History from './pages/History';
import SignupForm from './components/SignupForm';
import Settings from './pages/Settings';
import BottomNav from './components/BottomNav';
import RequirePro from './components/RequirePro';
import UpgradeCard from './components/UpgradeCard';
import Insights from './pages/Insights';
import ExportData from './pages/ExportData';
import OnboardingGate from './components/OnboardingGate';
import Welcome from './pages/Welcome';

function Layout() {
  const { pathname } = useLocation();
  const hideBar =
    pathname.startsWith('/ritual/start') ||
    pathname === '/welcome';

  return (
    <div className="min-h-[100svh] flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {!hideBar && <BottomNav />}
    </div>
  );
}

export default function App() {
  // Apply saved theme on boot; keep System reactive; handle BFCache & cross-tab changes.
  useEffect(() => {
    // 1) initial apply
    applyTheme(loadTheme());

    // 2) react to OS theme changes when appearance === 'system'
    const unbind = bindSystemThemeReactivity(() => loadTheme().appearance);

    // 3) re-apply after BFCache restores (mobile Safari/Chrome)
    const onPageShow = () => applyTheme(loadTheme());
    window.addEventListener('pageshow', onPageShow);

    // 4) keep multiple tabs/windows in sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ui.theme.v1') {
        try {
          const next = e.newValue ? JSON.parse(e.newValue) : loadTheme();
          applyTheme(next);
        } catch {
          applyTheme(loadTheme());
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      unbind?.();
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/auth" element={<AuthScreen />} />

          {/* Authed + Onboarding gate */}
          <Route
            element={
              <Protected>
                <OnboardingGate>
                  <Layout />
                </OnboardingGate>
              </Protected>
            }
          >
            {/* Onboarding */}
            <Route path="/welcome" element={<Welcome />} />

            {/* Main */}
            <Route index element={<Navigate to="/log" replace />} />
            <Route path="/log" element={<MoodLog />} />
            <Route path="/ritual" element={<RitualSuggestion />} />
            <Route path="/ritual/start" element={<RitualPlayer />} />
            <Route path="/ritual/done" element={<RitualDone />} />
            <Route path="/rituals" element={<RitualLibrary />} />
            <Route path="/library" element={<RitualLibrary />} />
            <Route path="/history" element={<History />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />

            {/* Pro-only */}
            <Route
              path="/insights"
              element={
                <RequirePro fallback={<UpgradeCard />}>
                  <Insights />
                </RequirePro>
              }
            />
            <Route
              path="/export"
              element={
                <RequirePro fallback={<UpgradeCard />}>
                  <ExportData />
                </RequirePro>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/log" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
