import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getDueRevisions } from '../lib/spacedRepetition';
import { SkeletonCard, SkeletonRow } from '../components/ui/Skeleton';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function StatCard({ label, value, sub, linkTo, color = '#10B981' }) {
  return (
    <Link
      to={linkTo}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-1 hover:shadow-sm transition-shadow"
    >
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold" style={{ color }}>{value}</span>
      {sub && <span className="text-xs text-gray-400 dark:text-gray-500">{sub}</span>}
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const today = localToday();
  const currentMonth = today.slice(0, 7);

  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState([]);
  const [dueRevisions, setDueRevisions] = useState([]);
  const [taskStreak, setTaskStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [financeData, setFinanceData] = useState({ budget: 0, spent: 0 });
  const [completedToday, setCompletedToday] = useState(0);

  // Set page title
  useEffect(() => {
    document.title = 'Dashboard | StudySync';
    return () => { document.title = 'StudySync'; };
  }, []);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  async function loadDashboard() {
    setLoading(true);
    const d = new Date();
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

    const [tasksRes, gateRes, completedDatesRes, dsaProblemsRes, budgetRes, entriesRes] =
      await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('date', today),
        supabase.from('gate_topics').select('*').eq('user_id', user.id),
        // Streak: DISTINCT dates where at least one task was completed
        supabase
          .from('tasks')
          .select('date')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .order('date', { ascending: false }),
        supabase
          .from('dsa_problems')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_solved', true),
        supabase
          .from('finance_budget')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', currentMonth + '-01')
          .maybeSingle(),
        supabase
          .from('finance_entries')
          .select('amount, type')
          .eq('user_id', user.id)
          .gte('date', currentMonth + '-01')
          .lte('date', currentMonth + '-' + String(lastDayOfMonth).padStart(2, '0')),
      ]);

    const tasks = tasksRes.data || [];
    setTodayTasks(tasks);
    setCompletedToday(tasks.filter((t) => t.is_completed).length);
    setDueRevisions(getDueRevisions(gateRes.data || []));
    setTotalSolved(dsaProblemsRes.data?.length || 0);

    // Streak: count consecutive days backwards from today where tasks were completed
    const datesWithCompletions = new Set((completedDatesRes.data || []).map((r) => r.date));
    let streak = 0;
    const streakDate = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = `${streakDate.getFullYear()}-${String(streakDate.getMonth() + 1).padStart(2, '0')}-${String(streakDate.getDate()).padStart(2, '0')}`;
      if (datesWithCompletions.has(ds)) {
        streak++;
        streakDate.setDate(streakDate.getDate() - 1);
      } else if (i === 0) {
        streakDate.setDate(streakDate.getDate() - 1); // today has no completions yet — check yesterday
      } else {
        break;
      }
    }
    setTaskStreak(streak);

    const budget = budgetRes.data?.total_budget || 0;
    const spent = (entriesRes.data || [])
      .filter((e) => e.type === 'expense')
      .reduce((s, e) => s + Number(e.amount), 0);
    setFinanceData({ budget, spent });

    setLoading(false);
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const budgetPct = financeData.budget > 0 ? Math.min(100, Math.round((financeData.spent / financeData.budget) * 100)) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mt-1" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
          <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          {[1,2,3].map(i => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {greeting()}{name ? `, ${name}` : ''}! 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Tasks Today"
          value={`${completedToday}/${todayTasks.length}`}
          sub="completed"
          linkTo="/app/tasks"
        />
        <StatCard
          label="GATE Revisions Due"
          value={dueRevisions.length}
          sub="topics due today"
          linkTo="/app/gate"
          color={dueRevisions.length > 0 ? '#EF4444' : '#10B981'}
        />
        <StatCard
          label="Task Streak"
          value={`${taskStreak} 🔥`}
          sub={taskStreak === 1 ? '1 day in a row' : taskStreak > 0 ? `${taskStreak} days in a row` : 'Complete a task to start'}
          linkTo="/app/calendar"
          color="#F59E0B"
        />
        <StatCard
          label="Budget Used"
          value={`${budgetPct}%`}
          sub={financeData.budget > 0 ? `₹${financeData.spent.toLocaleString()} of ₹${financeData.budget.toLocaleString()}` : 'No budget set'}
          linkTo="/app/finance"
          color={budgetPct > 90 ? '#EF4444' : budgetPct > 70 ? '#F59E0B' : '#10B981'}
        />
      </div>

      {/* Today's tasks preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Today's Tasks</h2>
          <Link to="/app/tasks" className="text-xs text-[#10B981] font-medium hover:underline">
            View all →
          </Link>
        </div>
        {todayTasks.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400 dark:text-gray-500">No tasks for today.</p>
            <Link to="/app/tasks" className="text-xs text-[#10B981] font-medium mt-1 inline-block hover:underline">
              Add a task →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {todayTasks.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-1.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    t.priority === 'high' ? 'bg-red-400' : t.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span
                  className={`text-sm flex-1 ${t.is_completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}
                >
                  {t.title}
                </span>
                {t.time && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{t.time.slice(0, 5)}</span>
                )}
              </li>
            ))}
            {todayTasks.length > 5 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                +{todayTasks.length - 5} more —{' '}
                <Link to="/app/tasks" className="text-[#10B981] hover:underline">view all</Link>
              </p>
            )}
          </ul>
        )}
      </div>

      {/* Due revisions */}
      {dueRevisions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              GATE Revisions Due
              <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                {dueRevisions.length}
              </span>
            </h2>
            <Link to="/app/gate" className="text-xs text-[#10B981] font-medium hover:underline">
              Go to GATE →
            </Link>
          </div>
          <ul className="space-y-2">
            {dueRevisions.slice(0, 4).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span className="text-sm text-gray-900 dark:text-white flex-1">{t.topic}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{t.subject}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
