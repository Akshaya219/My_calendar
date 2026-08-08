import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  BookOpen,
  Code2,
  Wallet,
  Briefcase,
  User,
  Sun,
  Moon,
  FileText,
  Map,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

// eslint-disable-next-line react-refresh/only-export-components
export const ALL_TABS = [
  { label: 'Dashboard', path: '/app',            end: true,  Icon: LayoutDashboard, module: 'dashboard' },
  { label: 'Planner',   path: '/app/calendar',   end: false, Icon: Calendar,        module: 'planner' },
  { label: 'AI Manager',path: '/app/ai-manager', end: false, Icon: Sparkles,        module: 'ai-manager' },
  { label: 'GATE Prep', path: '/app/gate',       end: false, Icon: BookOpen,        module: 'gate' },
  { label: 'DSA Practice',path: '/app/dsa',      end: false, Icon: Code2,           module: 'dsa' },
  { label: 'Finances',  path: '/app/finance',    end: false, Icon: Wallet,          module: 'finance' },
  { label: 'Placement', path: '/app/placement',  end: false, Icon: Briefcase,       module: 'placement' },
  { label: 'Notes',     path: '/app/notes',      end: false, Icon: FileText,        module: 'notes' },
  { label: 'Roadmap',   path: '/app/roadmap',    end: false, Icon: Map,             module: 'roadmap' },
  { label: 'Profile',   path: '/app/settings',   end: false, Icon: User,            module: 'settings' },
];

// ── Desktop sortable sidebar item ──────────────────────────────────────────────
function SortableSidebarItem({ tab, sidebarCollapsed }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.module });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: 'relative',
  };
  const Icon = tab.Icon;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={isDragging ? 'opacity-80' : ''}>
      <NavLink
        to={tab.path}
        end={tab.end}
        className={({ isActive }) =>
          `flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-semibold transition-all cursor-grab active:cursor-grabbing ${
            isActive
              ? 'text-[#10B981] bg-emerald-50 dark:bg-emerald-950/20 shadow-sm border border-emerald-100/10'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent'
          }`
        }
      >
        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
        {!sidebarCollapsed && <span className="truncate">{tab.label}</span>}
      </NavLink>
    </div>
  );
}

// ── Theme toggle (shared) ──────────────────────────────────────────────────────
function ThemeToggle({ user }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (user) {
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

// ── Mobile bottom tab (plain NavLink, no DnD) ──────────────────────────────────
function MobileTabItem({ tab, onNavigate }) {
  const Icon = tab.Icon;
  return (
    <NavLink
      to={tab.path}
      end={tab.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 flex-1 h-full py-1 transition-all ${
          isActive
            ? 'text-[#10B981]'
            : 'text-gray-400 dark:text-gray-500'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''}`}>
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold tracking-wide leading-none">
            {tab.label.split(' ')[0]}
          </span>
        </>
      )}
    </NavLink>
  );
}

// ── Mobile "More" bottom sheet ──────────────────────────────────────────────────
function MobileMoreSheet({ isOpen, onClose, overflowTabs, user, onSignOut }) {
  const sheetRef = useRef(null);

  // Close on backdrop tap
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Trap body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const fullName = user?.user_metadata?.full_name || '';
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        className={`md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* User header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-sm flex items-center justify-center shadow-md shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-gray-900 dark:text-white truncate">
              {fullName || user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overflow nav items */}
        <div className="overflow-y-auto px-4 py-3 space-y-1" style={{ maxHeight: 'calc(80vh - 180px)' }}>
          {overflowTabs.map((tab) => {
            const Icon = tab.Icon;
            return (
              <NavLink
                key={tab.module}
                to={tab.path}
                end={tab.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-[#10B981] bg-emerald-50 dark:bg-emerald-950/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span>{tab.label}</span>
                    {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom actions: theme + sign out */}
        <div className="px-4 pb-6 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <ThemeToggle user={user} />
          <button
            onClick={onSignOut}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 text-sm font-bold transition-all hover:bg-red-100 dark:hover:bg-red-950/40"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Layout ────────────────────────────────────────────────────────────────
export default function Layout() {
  const { user, preferences } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const activeModules = preferences?.active_modules || ['planner', 'ai-manager'];

  const baseVisibleTabs = ALL_TABS.filter(
    (tab) =>
      ['dashboard', 'settings', 'ai-manager', 'notes'].includes(tab.module) ||
      activeModules.includes(tab.module)
  );

  const [localNavOrder, setLocalNavOrder] = useState([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (preferences?.nav_order) setLocalNavOrder(preferences.nav_order);
  }, [preferences?.nav_order]);

  const savedOrder = localNavOrder.length > 0 ? localNavOrder : (preferences?.nav_order || JSON.parse(localStorage.getItem('nav_order') || '[]'));

  const visibleTabs = [...baseVisibleTabs].sort((a, b) => {
    const indexA = savedOrder.indexOf(a.module);
    const indexB = savedOrder.indexOf(b.module);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return 0;
  });

  // ── Mobile nav: first 4 tabs in bar, rest go in "More" sheet ──────────────
  const MOBILE_PIN_COUNT = 4;
  const mobilePinnedTabs = visibleTabs.slice(0, MOBILE_PIN_COUNT);
  const mobileOverflowTabs = visibleTabs.slice(MOBILE_PIN_COUNT);

  // ── Desktop DnD (sidebar only) ─────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = visibleTabs.findIndex(t => t.module === active.id);
      const newIndex = visibleTabs.findIndex(t => t.module === over.id);
      const newTabs = arrayMove(visibleTabs, oldIndex, newIndex);
      const newOrder = newTabs.map(t => t.module);
      setLocalNavOrder(newOrder);
      localStorage.setItem('nav_order', JSON.stringify(newOrder));
      if (user) {
        supabase
          .from('user_preferences')
          .update({ nav_order: newOrder, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.error('Failed to save nav order to DB. Local storage fallback used.');
          });
      }
    }
  };

  // Close "More" sheet when route changes
  useEffect(() => {
    setMoreSheetOpen(false);
  }, [location.pathname]);

  const currentTab = ALL_TABS.find((t) => t.path === location.pathname);
  const pageTitle = currentTab?.label || 'StudySync';

  const getContextualAction = () => {
    switch (location.pathname) {
      case '/app/calendar':   return { label: 'Add Task',        event: 'studysync-add-task' };
      case '/app/finance':    return { label: 'Log transaction',  event: 'studysync-add-finance' };
      case '/app/dsa':        return { label: 'Log problem',      event: 'studysync-add-dsa' };
      case '/app/gate':       return { label: 'Log mock',         event: 'studysync-add-gate' };
      case '/app/placement':  return { label: 'Add company',      event: 'studysync-add-company' };
      default:                return null;
    }
  };

  const actionConfig = getContextualAction();

  const handleActionClick = () => {
    if (actionConfig) window.dispatchEvent(new CustomEvent(actionConfig.event));
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const fullName = user?.user_metadata?.full_name || '';
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();

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

        {/* Sidebar Nav — drag-to-reorder on desktop */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleTabs.map(t => t.module)} strategy={verticalListSortingStrategy}>
              {visibleTabs.map((tab) => (
                <SortableSidebarItem key={tab.module} tab={tab} sidebarCollapsed={sidebarCollapsed} />
              ))}
            </SortableContext>
          </DndContext>
        </nav>

        {/* Sidebar Bottom Controls */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 space-y-2 shrink-0">
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

        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase">
            {pageTitle}
          </h2>

          <div className="flex items-center gap-2 md:gap-4">
            {actionConfig && (
              <button
                onClick={handleActionClick}
                className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer active:scale-95 animate-in slide-in-from-right-4 duration-300"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                <span className="hidden sm:inline">{actionConfig.label}</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}

            {/* Mobile-only: theme + avatar */}
            <div className="md:hidden flex items-center gap-1">
              <ThemeToggle user={user} />
              <button
                onClick={() => navigate('/app/settings')}
                className="w-8 h-8 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-center cursor-pointer shadow-sm"
              >
                {initials}
              </button>
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

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        {/* Safe-area padding for iPhone home indicator */}
        <div className="flex items-stretch h-16 px-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {mobilePinnedTabs.map((tab) => (
            <MobileTabItem key={tab.module} tab={tab} />
          ))}

          {/* "More" button — only shown when there are overflow tabs */}
          {mobileOverflowTabs.length > 0 && (
            <button
              onClick={() => setMoreSheetOpen(true)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full py-1 transition-all ${
                mobileOverflowTabs.some(t => location.pathname === t.path)
                  ? 'text-[#10B981]'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${
                mobileOverflowTabs.some(t => location.pathname === t.path)
                  ? 'bg-emerald-50 dark:bg-emerald-950/30'
                  : ''
              }`}>
                <MoreHorizontal className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold tracking-wide leading-none">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Mobile "More" Bottom Sheet ── */}
      <MobileMoreSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        overflowTabs={mobileOverflowTabs}
        user={user}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
