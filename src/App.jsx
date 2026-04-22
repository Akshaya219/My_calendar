import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import GateTracker from './pages/GateTracker';
import DSATracker from './pages/DSATracker';
import Finance from './pages/Finance';
import {
  requestPermission,
  scheduleUpcomingReminders,
  scheduleDailyMorningReminder,
} from './lib/notifications';

function App() {
  const [sessionReady, setSessionReady] = useState(false);

  // ── Session detection (critical for OAuth redirect flow) ──────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionReady(true);
      if (session?.user) {
        initNotifications(session.user.id);
      }
    });

    // Also handle login that happens AFTER this mount (e.g. user signs in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          initNotifications(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Request permission once, then schedule all upcoming reminders.
   * Called when a valid session is detected. Safe to call multiple times
   * (requestPermission resolves instantly if already granted/denied).
   */
  async function initNotifications(userId) {
    const permission = await requestPermission();
    if (permission !== 'granted') return; // user denied — never re-prompt
    scheduleUpcomingReminders(userId);
    scheduleDailyMorningReminder();
  }

  // Show nothing until we've checked the session (prevents flash of login page)
  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <svg
          className="animate-spin h-8 w-8 text-[#4F46E5]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          {/* /app/calendar → full Tasks/Calendar page */}
          <Route path="calendar" element={<Tasks />} />
          {/* keep /app/tasks as alias so old links still work */}
          <Route path="tasks" element={<Navigate to="/app/calendar" replace />} />
          <Route path="gate" element={<GateTracker />} />
          <Route path="dsa" element={<DSATracker />} />
          <Route path="finance" element={<Finance />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

