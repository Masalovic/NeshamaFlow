// src/App.tsx
import React from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom'
import Protected from './components/Protected';
import AuthScreen from './pages/AuthScreen';
import Profile from './pages/Profile';
import MoodLog from './pages/MoodLog'
import RitualSuggestion from './pages/RitualSuggestion'
import RitualPlayer from './pages/RitualPlayer'
import RitualDone from './pages/RitualDone'
import History from './pages/History'
import SignupForm from './components/SignupForm'
import Settings from './pages/Settings'
import BottomNav from './components/BottomNav'
import RequirePro from './components/RequirePro'
import UpgradeCard from './components/UpgradeCard'
import Insights from './pages/Insights'
import ExportData from './pages/ExportData'

function Layout() {
  const { pathname } = useLocation();
  const hideBar = pathname.startsWith('/ritual/start'); // keep hidden on timer screen

  return (
    <div className="min-h-[100svh] flex flex-col"> {/* svh avoids mobile URL-bar jumps */}
      {/* This is the SINGLE scroll area for the app */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {!hideBar && <BottomNav />}
    </div>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Protected><Layout /></Protected>}>
          <Route index element={<Navigate to="/log" replace />} />
          <Route path="/log" element={<MoodLog />} />
          <Route path="/ritual" element={<RitualSuggestion />} />
          <Route path="/ritual/start" element={<RitualPlayer />} />
          <Route path="/ritual/done" element={<RitualDone />} />
          <Route path="/history" element={<History />} />
          <Route path="/signup" element={<SignupForm />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />

          {/* Pro routes */}
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

          <Route path="*" element={<Navigate to="/log" replace />} />
          <Route path="/auth" element={<AuthScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
