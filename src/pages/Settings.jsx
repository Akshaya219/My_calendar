import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import {
  Code2,
  BookOpen,
  Wallet,
  Briefcase,
  User,
  Trash2,
  Download,
  RefreshCw,
  Bell,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { requestPermission } from '../lib/notifications';

const OPTIONAL_MODULES = [
  { id: 'dsa', name: 'DSA Practice', description: 'Track LeetCode problems and practice targets.', Icon: Code2, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'gate', name: 'GATE Prep', description: 'Syllabus tracker with spaced repetition.', Icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'finance', name: 'Finances', description: 'Log expenses, budgets, and get forecasts.', Icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'placement', name: 'Placement Prep', description: 'Manage job pipelines and prep checklists.', Icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10' }
];

export default function Settings() {
  const { user, preferences, refreshPreferences } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeModules, setActiveModules] = useState([]);
  const [theme, setTheme] = useState('light');
  const [notifPermission, setNotifPermission] = useState('default');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.title = 'Profile | StudySync';
    if (preferences) {
      setActiveModules(preferences.active_modules || ['planner', 'ai-manager']);
      setTheme(preferences.theme || 'light');
    }
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, [preferences]);

  // Handle module toggle
  const handleToggleModule = async (moduleId) => {
    if (!user || updating) return;
    setUpdating(true);
    let nextModules;
    if (activeModules.includes(moduleId)) {
      nextModules = activeModules.filter((m) => m !== moduleId);
    } else {
      nextModules = [...activeModules, moduleId];
    }

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ active_modules: nextModules, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
      setActiveModules(nextModules);
      await refreshPreferences();
      showToast('Study Plan updated!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Handle theme choice
  const handleThemeChange = async (newTheme) => {
    if (!user || updating) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ theme: newTheme, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
      setTheme(newTheme);
      await refreshPreferences();
      showToast(`Theme changed to ${newTheme}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Browser notification trigger
  const triggerNotificationPermission = async () => {
    const perm = await requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      showToast('Notifications enabled successfully! 🔔');
    } else {
      showToast('Permission denied or unsupported', 'warning');
    }
  };

  // Reset Onboarding Setup
  const handleResetOnboarding = async () => {
    if (!user) return;
    const confirmReset = window.confirm('Are you sure you want to redo the module setup? This will reload the onboarding screen.');
    if (!confirmReset) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ onboarded_at: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
      await refreshPreferences();
      showToast('Redirecting to Onboarding setup...');
      navigate('/onboarding');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Export all user data as CSV
  const handleExportAll = async () => {
    if (!user) return;
    showToast('Compiling data package...', 'info');

    try {
      // Query database tables
      const [tasksRes, dsaRes, gateRes, financeRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('dsa_problems').select('*').eq('user_id', user.id),
        supabase.from('user_syllabus_progress').select('*, gate_subtopics(name)').eq('user_id', user.id),
        supabase.from('finance_entries').select('*').eq('user_id', user.id)
      ]);

      const tasks = tasksRes.data || [];
      const dsa = dsaRes.data || [];
      const gate = gateRes.data || [];
      const finance = financeRes.data || [];

      // Build Combined CSV contents
      let csvContent = "StudySync Data Export\n\n";

      // 1. Tasks
      csvContent += "--- DAILY PLANNER TASKS ---\n";
      csvContent += "Title,Date,Time,Priority,Category,Completed,Checklist\n";
      tasks.forEach(t => {
        csvContent += `"${t.title.replace(/"/g, '""')}",${t.date},${t.time || ''},${t.priority},${t.category},${t.is_completed},${t.is_daily_checklist}\n`;
      });

      // 2. DSA
      csvContent += "\n--- DSA PROBLEMS ---\n";
      csvContent += "Title,Topic,Difficulty,Platform,Status,Solved At\n";
      dsa.forEach(d => {
        csvContent += `"${d.title.replace(/"/g, '""')}",${d.topic},${d.difficulty},${d.platform},${d.status},${d.solved_at || ''}\n`;
      });

      // 3. GATE
      csvContent += "\n--- GATE TOPICS PROGRESS ---\n";
      csvContent += "Subtopic Name,Completed,Revisions Count,Next Revision Date\n";
      gate.forEach(g => {
        if (g.gate_subtopics) {
          csvContent += `"${g.gate_subtopics.name.replace(/"/g, '""')}",${g.is_completed},${g.revision_count},${g.next_revision_date || ''}\n`;
        }
      });

      // 4. Finance
      csvContent += "\n--- FINANCE ENTRIES ---\n";
      csvContent += "Date,Type,Category,Description,Amount,Payment Method\n";
      finance.forEach(f => {
        csvContent += `${f.date},${f.type},${f.category},"${(f.description || '').replace(/"/g, '""')}",${f.amount},${f.payment_method || 'UPI'}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `StudySync_All_Data_${user.email.split('@')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('All records exported successfully!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmDel = window.confirm('⚠️ WARNING: Are you absolutely sure you want to delete your account? This will permanently delete your workspace layout preferences, checklist tasks, finance histories, and study progress. This cannot be undone.');
    if (!confirmDel) return;

    setDeleting(true);
    try {
      await supabase.from('user_preferences').delete().eq('user_id', user.id);
      await supabase.auth.signOut();
      showToast('Account credentials and data erased.');
      navigate('/login', { replace: true });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto">
      
      {/* ── Profile Header (Premium Glassmorphism) ── */}
      <div className="relative w-full rounded-[2.5rem] overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm mb-12">
        {/* Gradient Banner */}
        <div className="h-40 md:h-52 w-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
        </div>
        
        {/* Avatar & Info */}
        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8 -mt-16 md:-mt-20 relative z-10">
            {/* Avatar Circle */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-700 shadow-lg flex items-center justify-center shrink-0 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-cyan-100 dark:from-gray-700 dark:to-gray-600 opacity-50" />
              <User className="w-14 h-14 md:w-16 md:h-16 text-emerald-600 dark:text-emerald-400 relative z-10" />
            </div>
            
            {/* User Meta */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white truncate">
                  {user?.email?.split('@')[0] || 'Scholar'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Pro
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{user?.email}</p>
            </div>
            
            {/* Action */}
            <div className="pb-2">
              <button
                onClick={handleSignOut}
                className="px-6 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-black uppercase tracking-wider transition-all shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Your Study Plan Features ── */}
      <section>
        <div className="mb-6 px-2">
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">Your Study Plan</h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Toggle modules to customize your sidebar and dashboard.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {OPTIONAL_MODULES.map(({ id, name, description, Icon, color, bg }) => {
            const isActive = activeModules.includes(id);
            return (
              <div
                key={id}
                className={`relative overflow-hidden rounded-3xl p-6 transition-all duration-300 border-2 flex items-center justify-between group ${
                  isActive 
                    ? 'bg-white dark:bg-gray-800 border-emerald-500/30 dark:border-emerald-500/30 shadow-md' 
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50'
                }`}
              >
                {/* Background glow if active */}
                {isActive && (
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
                )}
                
                <div className="flex items-center gap-5 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isActive ? bg : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Icon className={`w-6 h-6 ${isActive ? color : 'text-gray-400 dark:text-gray-500'}`} />
                  </div>
                  <div>
                    <h4 className={`text-base font-black mb-1 ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {name}
                    </h4>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 line-clamp-1">{description}</p>
                  </div>
                </div>

                {/* Premium Animated Toggle */}
                <button
                  onClick={() => handleToggleModule(id)}
                  disabled={updating}
                  className={`relative w-14 h-8 rounded-full p-1 transition-colors duration-300 cursor-pointer shadow-inner shrink-0 ml-4 ${
                    isActive ? 'bg-[#10B981]' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                    isActive ? 'translate-x-6' : 'translate-x-0'
                  }`}>
                    {isActive && <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── App Preferences ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Theme Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 md:p-8 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500" /> Theme Preferences
          </h3>
          
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', name: 'Light', Icon: Sun },
              { id: 'dark', name: 'Dark', Icon: Moon },
              { id: 'system', name: 'System', Icon: Laptop }
            ].map(({ id, name, Icon }) => (
              <button
                key={id}
                onClick={() => handleThemeChange(id)}
                disabled={updating}
                className={`p-4 rounded-2xl flex flex-col items-center gap-3 transition-all cursor-pointer border-2 ${
                  theme === id
                    ? 'border-[#10B981] bg-emerald-50 dark:bg-emerald-900/20 text-[#10B981]'
                    : 'border-transparent bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-bold">{name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" /> Smart Reminders
            </h3>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Enable native browser alerts to receive your daily 9 AM digest and instant popups for tasks that are due soon. Stay perfectly synced with your schedule.
            </p>
          </div>
          
          <button
            onClick={triggerNotificationPermission}
            className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
              notifPermission === 'granted'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-200 dark:border-blue-800'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
            }`}
          >
            {notifPermission === 'granted' ? 'Alerts Authorized ✓' : 'Enable Notifications'}
          </button>
        </div>

      </section>

      {/* ── Data & Security ── */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 md:p-8 shadow-sm">
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" /> Data & Security
        </h3>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-6">
          Export your study records, refresh your workspace layout, or permanently erase your data from our servers.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleExportAll}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            Export Data
          </button>

          <button
            onClick={handleResetOnboarding}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer transition-all"
          >
            <RefreshCw className="w-4 h-4 text-blue-500" />
            Redo Wizard
          </button>
          
          <div className="hidden sm:block flex-1" />

          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Erasing...' : 'Delete Account'}
          </button>
        </div>
      </section>

    </div>
  );
}
