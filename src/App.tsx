// src/App.tsx
import React from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom'
import MoodLog from './pages/MoodLog'
import RitualSuggestion from './pages/RitualSuggestion'
import RitualPlayer from './pages/RitualPlayer'
import RitualDone from './pages/RitualDone'
import History from './pages/History'
import SignupForm from './components/SignupForm'
import Settings from './pages/Settings'
import BottomNav from './components/BottomNav'

function Layout() {
  const { pathname } = useLocation()
  const hideBar = pathname.startsWith('/ritual/start') // hide on the timer screen if you want
  return (
    <div className="screen">
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      {!hideBar && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/log" replace />} />
          <Route path="/log" element={<MoodLog />} />
          <Route path="/ritual" element={<RitualSuggestion />} />
          <Route path="/ritual/start" element={<RitualPlayer />} />
          <Route path="/ritual/done" element={<RitualDone />} />
          <Route path="/history" element={<History />} />
          <Route path="/signup" element={<SignupForm />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/log" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
