import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { SkeletonCard, SkeletonRow } from '../components/ui/Skeleton';

import { 
  Trophy, 
  Flame, 
  Clock, 
  Target, 
  Code2, 
  BookOpen,
  TrendingUp, 
  Timer,
  ChevronRight,
  Plus
} from 'lucide-react';


const GATE_EXAM_DATE = new Date('2027-02-01');


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
  const [allDueRevisions, setAllDueRevisions] = useState([]);
  const [taskStreak, setTaskStreak] = useState(0);
  const [dsaStats, setDsaStats] = useState({ solved: 0, total: 1 });
  const [gateStats, setGateStats] = useState({ completed: 0, total: 1 });
  const [financeData, setFinanceData] = useState({ budget: 0, spent: 0 });
  const [completedToday, setCompletedToday] = useState(0);

  // Set page title
  useEffect(() => {
    document.title = 'Command Center | StudySync';
    return () => { document.title = 'StudySync'; };
  }, []);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);


  async function loadDashboard() {
    setLoading(true);
    const d = new Date();
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

    const [tasksRes, progressRes, dsaCountRes, gateCountRes, dsaSolvedRes, completedDatesRes, budgetRes, entriesRes] =
      await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('date', today),
        supabase.from('user_syllabus_progress').select(`
          *,
          dsa_subtopics(name),
          gate_subtopics(name)
        `).eq('user_id', user.id),
        supabase.from('dsa_subtopics').select('id', { count: 'exact' }),
        supabase.from('gate_subtopics').select('id', { count: 'exact' }),
        supabase.from('dsa_problems').select('id').eq('user_id', user.id).eq('is_solved', true),
        // Streak: DISTINCT dates where at least one task was completed
        supabase
          .from('tasks')
          .select('date')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .order('date', { ascending: false }),
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

    const progress = progressRes.data || [];
    const todayStr = new Date().toISOString().split('T')[0];
    const due = progress
      .filter(p => p.is_completed && p.next_revision_date && p.next_revision_date <= todayStr)
      .map(p => ({
        id: p.id,
        name: p.dsa_subtopics?.name || p.gate_subtopics?.name || 'Unknown',
        type: p.dsa_subtopic_id ? 'DSA' : 'GATE'
      }));
    setAllDueRevisions(due);

    setDsaStats({ 
      solved: dsaSolvedRes.data?.length || 0, 
      total: dsaCountRes.count || 1 
    });
    
    setGateStats({
      completed: progress.filter(p => p.gate_subtopic_id && p.is_completed).length,
      total: gateCountRes.count || 1
    });


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

  const daysRemaining = Math.ceil((GATE_EXAM_DATE - new Date()) / (1000 * 60 * 60 * 24));
  const gatePct = Math.round((gateStats.completed / gateStats.total) * 100);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mt-1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Greetings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {greeting()}{name ? `, ${name}` : ''}!
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2 mt-1">
            <Timer className="w-4 h-4 text-[#10B981]" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl px-5 py-3 flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">GATE 2027</p>
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{daysRemaining} Days Left</p>
          </div>
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Timer className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Today's Tasks"
          value={`${completedToday}/${todayTasks.length}`}
          sub="Items completed"
          linkTo="/app/tasks"
          color="#10B981"
        />
        <StatCard
          label="Revision Queue"
          value={allDueRevisions.length}
          sub="Topics to review"
          linkTo="/app/gate"
          color={allDueRevisions.length > 0 ? '#EF4444' : '#10B981'}
        />
        <StatCard
          label="Placement Streak"
          value={`${taskStreak} 🔥`}
          sub="Consecutive days"
          linkTo="/app/calendar"
          color="#F59E0B"
        />
        <StatCard
          label="Budget Status"
          value={`${budgetPct}%`}
          sub="Month usage"
          linkTo="/app/finance"
          color={budgetPct > 90 ? '#EF4444' : '#10B981'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prep Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GATE Progress Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm group hover:border-[#10B981] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-2xl font-black text-gray-900 dark:text-white">{gatePct}%</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">GATE DA+CS Syllabus</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{gateStats.completed} of {gateStats.total} subtopics mastered</p>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${gatePct}%` }} />
              </div>
              <Link to="/app/gate" className="mt-4 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-blue-600 hover:text-blue-700">
                Update Syllabus <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* DSA Health Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm group hover:border-[#10B981] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-[#10B981]" />
                </div>
                <span className="text-2xl font-black text-gray-900 dark:text-white">{dsaStats.solved}</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">DSA Problem Log</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Mastery through practice</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 h-3 rounded-sm ${i < (dsaStats.solved / 10) ? 'bg-[#10B981]' : 'bg-gray-100 dark:bg-gray-700'}`}
                  />
                ))}
              </div>
              <Link to="/app/dsa" className="mt-4 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[#10B981] hover:text-[#059669]">
                View Solved Problems <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Today's Tasks List */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-[#10B981]" />
                Target Activities
              </h2>
              <Link to="/app/tasks" className="text-xs font-bold text-[#10B981] hover:underline uppercase tracking-widest">
                Manage
              </Link>
            </div>
            <div className="p-2">
              {todayTasks.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">No tasks scheduled for today.</p>
                  <button className="mt-3 text-xs font-bold text-[#10B981]">+ Add Task</button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {todayTasks.slice(0, 5).map(t => (
                    <div key={t.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <div className={`w-2 h-2 rounded-full ${t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <span className={`text-sm font-medium flex-1 ${t.is_completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                        {t.title}
                      </span>
                      {t.time && <span className="text-[10px] font-bold text-gray-400">{t.time.slice(0,5)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* Revision Widget */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-emerald-50/50 dark:bg-emerald-900/10">
              <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                <Clock className="w-4 h-4 text-[#10B981]" />
                Daily Review
              </h2>
            </div>
            <div className="p-4">
              {allDueRevisions.length === 0 ? (
                <div className="py-6 text-center">
                  <Trophy className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">All caught up with revisions!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allDueRevisions.slice(0, 5).map(rev => (
                    <div key={rev.id} className="flex flex-col gap-1 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <span className={`text-[9px] font-black w-fit px-1.5 py-0.5 rounded ${rev.type === 'GATE' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                        {rev.type}
                      </span>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{rev.name}</span>
                    </div>
                  ))}
                  {allDueRevisions.length > 5 && (
                    <p className="text-[10px] text-center text-gray-400 pt-2">+{allDueRevisions.length - 5} more due</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#111827] rounded-2xl p-6 text-white shadow-xl shadow-black/20">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#10B981]" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link to="/app/dsa" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm">
                Log Problem <ChevronRight className="w-4 h-4 opacity-50" />
              </Link>
              <Link to="/app/tasks" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm">
                Add Task <ChevronRight className="w-4 h-4 opacity-50" />
              </Link>
              <Link to="/app/finance" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm">
                Log Expense <ChevronRight className="w-4 h-4 opacity-50" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





