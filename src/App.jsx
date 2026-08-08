import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import ProtectedRoute from './components/ProtectedRoute';
import ModuleGuard from './components/ModuleGuard';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import GateTracker from './pages/GateTracker';
import DSATracker from './pages/DSATracker';
import Finance from './pages/Finance';
import PlacementPrep from './pages/PlacementPrep';
import Settings from './pages/Settings';
import AiManager from './pages/AiManager';
import Notes from './pages/Notes';
import Roadmap from './pages/Roadmap';

import {
  scheduleUpcomingReminders,
  scheduleDailyMorningReminder,
  scheduleGateRevisionReminders,
} from './lib/notifications';

function App() {
  const { user, preferences } = useAuth();

  // Schedule push notifications once the user is known
  useEffect(() => {
    if (!user) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      scheduleUpcomingReminders(user.id);
      scheduleDailyMorningReminder();
      // Schedule GATE revision reminders if the user has the toggle enabled
      if (preferences?.gate_reminders_enabled !== false) {
        scheduleGateRevisionReminders(user.id);
      }
    }
  }, [user, preferences]);

  // NOTE: Loading state is handled inside ProtectedRoute.
  // App itself just renders the router — no spinner here to avoid double-blocking.
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute isOnboarding={true}>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<Tasks />} />
          <Route path="tasks" element={<Navigate to="/app/calendar" replace />} />

          <Route path="gate" element={<ModuleGuard module="gate"><GateTracker /></ModuleGuard>} />
          <Route path="dsa" element={<ModuleGuard module="dsa"><DSATracker /></ModuleGuard>} />
          <Route path="finance" element={<ModuleGuard module="finance"><Finance /></ModuleGuard>} />
          <Route path="placement" element={<ModuleGuard module="placement"><PlacementPrep /></ModuleGuard>} />
          <Route path="notes" element={<Notes />} />
          <Route path="roadmap" element={<ModuleGuard module="roadmap"><Roadmap /></ModuleGuard>} />
          <Route path="ai-manager" element={<AiManager />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
