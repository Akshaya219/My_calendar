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
    // Safety timeout: force loading to end after 3.5s
    const timer = setTimeout(() => {
      setSessionReady(true);
    }, 3500);

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          initNotifications(session.user.id);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setSessionReady(true);
        clearTimeout(timer);
      }
    }

    checkSession();

    // Also handle login that happens AFTER this mount (e.g. user signs in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          initNotifications(session.user.id);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  /**
   * Check if permission is granted, then schedule all upcoming reminders.
   * Called when a valid session is detected. Avoids browser errors by not
   * calling requestPermission() outside a user gesture.
   */
  async function initNotifications(userId) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    scheduleUpcomingReminders(userId);
    scheduleDailyMorningReminder();
  }

  // Show nothing until we've checked the session (prevents flash of login page)
  if (!sessionReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-emerald-100 dark:border-emerald-900 rounded-full" />
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-bold text-gray-900 dark:text-white animate-pulse">Initializing StudySync...</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Securely connecting to your dashboard</p>
        </div>
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

