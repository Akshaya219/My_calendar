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
      
      {/* ── Shared Responsive Header ── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 h-14 transition-colors">
        <div className="max-w-[900px] mx-auto h-full px-4 md:px-8 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-black text-sm leading-none">S</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white tracking-tight hidden sm:block">StudySync</span>
          </div>

          {/* Desktop Nav (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1">
            {TABS.map(({ label, path, end }) => (
              <NavLink
                key={path}
                to={path}
                end={end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-[#10B981] bg-emerald-50 dark:bg-emerald-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right — theme + user */}
          <div className="flex items-center gap-2">
            <ThemeToggle user={user} />
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#10B981] text-white text-xs font-bold flex items-center justify-center ring-2 ring-transparent group-hover:ring-emerald-500/30 transition-all shadow-sm">
                {initials}
              </div>
              <span className="hidden lg:block text-xs font-bold text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                Sign out
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1 w-full max-w-[900px] mx-auto px-4 pt-6 pb-20 md:px-8 md:pt-8 md:pb-8">
        <Outlet />
      </main>

      {/* ── Version Tag (Busting the "Old Version" myth) ── */}
      <div className="fixed bottom-20 md:bottom-4 right-4 z-10 pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-500 border border-gray-200 dark:border-gray-700">
          Build v1.0.3
        </span>
      </div>

      {/* ── Mobile Bottom Nav (hidden on desktop) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 h-14 flex items-center px-2 transition-colors">
        {TABS.map(({ label, path, end, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all ${
                isActive 
                  ? 'text-[#10B981] bg-emerald-50/50 dark:bg-emerald-900/10' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
