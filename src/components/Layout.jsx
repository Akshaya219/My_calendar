import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Code2,
  Wallet,
  Sun,
  Moon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const TABS = [
  { label: 'Dashboard', path: '/app',           end: true,  Icon: LayoutDashboard },
  { label: 'Calendar',  path: '/app/calendar',  end: false, Icon: CalendarDays    },
  { label: 'GATE',      path: '/app/gate',      end: false, Icon: BookOpen        },
  { label: 'DSA',       path: '/app/dsa',       end: false, Icon: Code2           },
  { label: 'Finance',   path: '/app/finance',   end: false, Icon: Wallet          },
];

function ThemeToggle({ user }) {
  const [theme, setTheme] = useState(() => {
    return user?.user_metadata?.theme || localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    if (user?.user_metadata?.theme && user.user_metadata.theme !== theme) {
      setTheme(user.user_metadata.theme);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_metadata?.theme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (user) {
      supabase.auth.updateUser({ data: { theme: newTheme } }).catch(console.error);
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
      className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none cursor-pointer"
      title="Toggle Theme"
    >
      {theme === 'dark' ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
    </button>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const fullName = user?.user_metadata?.full_name || '';
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors">

      {/* ── Desktop Top Nav ── */}
      <header className="hidden md:flex sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 h-14 items-center transition-colors">
        <div className="w-full max-w-[900px] mx-auto px-8 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#10B981] flex items-center justify-center">
              <span className="text-white font-bold text-sm leading-none">S</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-sm">StudySync</span>
          </div>

          {/* Center tab links */}
          <nav className="flex items-stretch h-14 gap-1">
            {TABS.map(({ label, path, end }) => (
              <NavLink
                key={path}
                to={path}
                end={end}
                className={({ isActive }) =>
                  `relative flex items-center px-4 text-sm transition-colors ${
                    isActive
                      ? 'font-semibold text-[#10B981]'
                      : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {/* 2px active bottom border */}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10B981] rounded-t-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right — theme toggle + avatar + sign out */}
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle user={user} />
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Sign out
            </button>
            <div
              className="w-8 h-8 rounded-full bg-[#10B981] text-white text-xs font-semibold flex items-center justify-center"
              title={user?.email}
            >
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Top Header ── */}
      <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 h-14 flex items-center justify-between px-4 transition-colors">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#10B981] flex items-center justify-center">
            <span className="text-white font-bold text-sm leading-none">S</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-sm">StudySync</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle user={user} />
          <div
            onClick={handleSignOut}
            className="w-7 h-7 rounded-full bg-[#10B981] text-white text-xs font-semibold flex items-center justify-center cursor-pointer"
            title="Sign Out"
          >
            {initials}
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1 w-full max-w-[900px] mx-auto px-4 pt-6 pb-20 md:px-8 md:pt-8 md:pb-8">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 h-14 flex items-center transition-colors">
        {TABS.map(({ label, path, end, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#10B981]' : 'text-gray-400 dark:text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#10B981]' : 'text-gray-400 dark:text-gray-500'}`} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
