import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  BookOpen,
  Code2,
  Wallet,
  Briefcase,
  Settings,
  User,
  Sun,
  Moon,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const ALL_TABS = [
  { label: 'Dashboard', path: '/app',            end: true,  Icon: LayoutDashboard, module: 'dashboard' },
  { label: 'Planner',   path: '/app/calendar',   end: false, Icon: Calendar,        module: 'planner' },
  { label: 'AI Manager',path: '/app/ai-manager', end: false, Icon: Sparkles,        module: 'ai-manager' },
  { label: 'GATE Prep', path: '/app/gate',       end: false, Icon: BookOpen,        module: 'gate' },
  { label: 'DSA Practice',path: '/app/dsa',      end: false, Icon: Code2,           module: 'dsa' },
  { label: 'Finances',  path: '/app/finance',    end: false, Icon: Wallet,          module: 'finance' },
  { label: 'Placement', path: '/app/placement',  end: false, Icon: Briefcase,       module: 'placement' },
  { label: 'Notes',     path: '/app/notes',      end: false, Icon: FileText,        module: 'notes' },
  { label: 'Profile',   path: '/app/settings',   end: false, Icon: User,            module: 'settings' },
];

function ThemeToggle({ user }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (user) {
      // Sync theme back to user preferences
      await supabase
        .from('user_preferences')
        .update({ theme: newTheme, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
      title="Toggle Theme"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

export default function Layout() {
  const { user, preferences, refreshPreferences } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeModules = preferences?.active_modules || ['planner', 'ai-manager'];

  // Filter tabs: 'dashboard', 'planner', 'ai-manager', 'settings', 'notes' are always available.
  // Others are optional.
  const visibleTabs = ALL_TABS.filter(
    (tab) =>
      ['dashboard', 'settings', 'ai-manager', 'notes'].includes(tab.module) ||
      activeModules.includes(tab.module)
  );

  // Compute page title and contextual button from path
  const currentTab = ALL_TABS.find((t) => t.path === location.pathname);
  const pageTitle = currentTab?.label || 'StudySync';

  // Action Button config per page
  const getContextualAction = () => {
    switch (location.pathname) {
      case '/app/calendar':
        return { label: 'Add Task', event: 'studysync-add-task' };
      case '/app/finance':
        return { label: 'Log transaction', event: 'studysync-add-finance' };
      case '/app/dsa':
        return { label: 'Log problem', event: 'studysync-add-dsa' };
      case '/app/gate':
        return { label: 'Log mock', event: 'studysync-add-gate' };
      case '/app/placement':
        return { label: 'Add company', event: 'studysync-add-company' };
      default:
        return null;
    }
  };

  const actionConfig = getContextualAction();

  const handleActionClick = () => {
    if (actionConfig) {
      window.dispatchEvent(new CustomEvent(actionConfig.event));
    }
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  // Get user profile details
  const fullName = user?.user_metadata?.full_name || '';
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();

  // Mobile Bottom Nav items (Limit to 5 to avoid overcrowding)
  const mobileNavTabs = visibleTabs.slice(0, 4);
  if (!mobileNavTabs.some((t) => t.module === 'settings')) {
    mobileNavTabs.push(ALL_TABS.find((t) => t.module === 'settings'));
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-300">
      
      {/* ── Desktop Left Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen transition-all duration-300 ease-in-out shrink-0 select-none z-30 sticky top-0 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 gap-3 border-b border-gray-100 dark:border-gray-700 overflow-hidden shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <span className="text-white font-black text-lg leading-none">S</span>
          </div>
          {!sidebarCollapsed && (
            <span className="font-extrabold text-lg text-gray-900 dark:text-white tracking-tight animate-in fade-in duration-200">
              StudySync
            </span>
          )}
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleTabs.map(({ label, path, end, Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'text-[#10B981] bg-emerald-50 dark:bg-emerald-950/20 shadow-sm border border-emerald-100/10'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
              {!sidebarCollapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Bottom Controls */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 space-y-2 shrink-0">
          {/* Theme Switch & Sign Out */}
          <div className="flex items-center justify-between gap-1">
            <ThemeToggle user={user} />
            <button
              onClick={handleSignOut}
              className="p-2.5 rounded-xl text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* User Profile Tag */}
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900 dark:text-white truncate uppercase tracking-wide">
                  {fullName || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-gray-400 truncate font-semibold">
                  {user?.email}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Content Container ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Context Bar */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase">
            {pageTitle}
          </h2>
          
          <div className="flex items-center gap-4">
            {actionConfig && (
              <button
                onClick={handleActionClick}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer active:scale-95 animate-in slide-in-from-right-4 duration-300"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                {actionConfig.label}
              </button>
            )}
            
            {/* Mobile-only avatar trigger */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle user={user} />
              <div
                onClick={() => navigate('/app/settings')}
                className="w-8 h-8 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-center cursor-pointer shadow-sm"
              >
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-gray-850/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-850 h-16 flex items-center px-2 shadow-lg transition-colors">
        {mobileNavTabs.map(({ label, path, end, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-[#10B981] bg-emerald-50/50 dark:bg-emerald-950/10'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5.5 h-5.5 ${isActive ? 'scale-110' : ''} transition-all`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-black uppercase tracking-wider">{label.split(' ')[0]}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

