import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Code2,
  Wallet,
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
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Desktop Top Nav ── */}
      <header className="hidden md:flex sticky top-0 z-40 bg-white border-b border-[#F3F4F6] h-14 items-center">
        <div className="w-full max-w-[900px] mx-auto px-8 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <span className="text-white font-bold text-sm leading-none">S</span>
            </div>
            <span className="font-bold text-[#111827] text-sm">StudySync</span>
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
                      ? 'font-semibold text-[#4F46E5]'
                      : 'font-medium text-[#6B7280] hover:text-[#111827]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {/* 2px active bottom border */}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5] rounded-t-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right — avatar + sign out */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSignOut}
              className="text-xs text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
            >
              Sign out
            </button>
            <div
              className="w-8 h-8 rounded-full bg-[#4F46E5] text-white text-xs font-semibold flex items-center justify-center"
              title={user?.email}
            >
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1 w-full max-w-[900px] mx-auto px-4 pt-6 pb-20 md:px-8 md:pt-8 md:pb-8">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#F3F4F6] h-14 flex items-center">
        {TABS.map(({ label, path, end, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#4F46E5]' : 'text-[#9CA3AF]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#4F46E5]' : 'text-[#9CA3AF]'}`} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
