import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

import { 
  Trophy, 
  Flame, 
  Clock, 
  Target, 
  Code2, 
  BookOpen,
  Timer,
  ChevronRight,
  Plus,
  RefreshCw,
  Check,
  Sparkles,
  FileText
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

function ActivityItem({ t, removeActivity }) {
  return (
    <div className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group/item">
      <div className={`w-2 h-2 rounded-full ${t.is_revision ? 'bg-purple-500' : t.is_syllabus ? (t.type === 'GATE' ? 'bg-blue-500' : 'bg-orange-500') : (t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500')}`} />
      <div className="flex-1 flex flex-col">
        <span className={`text-sm font-medium ${t.is_completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
          {t.title}
        </span>
        <div className="flex items-center gap-2">
          {t.is_syllabus && (
            <span className={`text-[10px] font-bold uppercase tracking-widest ${t.is_revision ? 'text-purple-500' : 'text-gray-400'}`}>
              {t.type} {t.is_revision ? 'Revision' : 'Topic'}
            </span>
          )}
          {t.is_overdue && !t.is_completed && (
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">Overdue</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {t.time && <span className="text-[10px] font-bold text-gray-400">{t.time.slice(0,5)}</span>}
        <button 
          onClick={() => removeActivity(t)}
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover/item:opacity-100 cursor-pointer"
          title={t.is_revision ? "Postpone to tomorrow" : "Remove from today"}
        >
          <Plus className="w-3.5 h-3.5 rotate-45" />
        </button>
      </div>
    </div>
  );
}


const DEFAULT_MODULES = ['planner', 'ai-manager'];

export default function Dashboard() {
  const { user, preferences } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const today = localToday();
  const currentMonth = today.slice(0, 7);

  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState([]);
  const [globalPendingTasks, setGlobalPendingTasks] = useState([]);
  const [allDueRevisions, setAllDueRevisions] = useState([]);
  const [taskStreak, setTaskStreak] = useState(0);
  const [dsaStats, setDsaStats] = useState({ solved: 0, total: 1 });
  const [gateStats, setGateStats] = useState({ completed: 0, total: 1 });
  
  // Finance stats
  const [financeNetBalance, setFinanceNetBalance] = useState(0);

  const [placementStats, setPlacementStats] = useState({ total: 0, offers: 0 });
  const [notesCount, setNotesCount] = useState(0);

  const [completedToday, setCompletedToday] = useState(0);
  const [dailyTargets, setDailyTargets] = useState({ dsa_goal: 2, gate_goal: 2 });
  const [todayProgress, setTodayProgress] = useState({ dsa: 0, gate: 0 });
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [editForm, setEditForm] = useState({ dsa_goal: 2, gate_goal: 2 });

  const activeModules = preferences?.active_modules || DEFAULT_MODULES;

  // Set page title
  useEffect(() => {
    document.title = 'Command Center | StudySync';
    return () => { document.title = 'StudySync'; };
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const d = new Date();
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

    const hasDsa = activeModules.includes('dsa');
    const hasGate = activeModules.includes('gate');
    const hasFinance = activeModules.includes('finance');
    const hasPlacement = activeModules.includes('placement');
    const hasNotes = activeModules.includes('notes');

    // Clean up old hardcoded "Solve X Coding Problems" tasks from the database
    supabase.from('tasks').delete().like('title', '%Solve % Coding Problems%').eq('user_id', user.id).then();

    try {
      const [
        tasksRes, 
        progressRes, 
        dsaCountRes, 
        gateCountRes, 
        dsaSolvedRes, 
        completedDatesRes, 
        _budgetRes, 
        entriesRes,
        dailyTargetsRes,
        dsaTodayRes,
        gateTodayRes,
        _dsaAllRes,
        _gateAllRes,
        globalPendingRes,
        placementRes,
        notesRes
      ] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('date', today),
        // Only fetch syllabus progress if DSA or GATE is active
        (hasDsa || hasGate)
          ? supabase.from('user_syllabus_progress').select('*, dsa_subtopics(name), gate_subtopics(name)').eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
        hasDsa
          ? supabase.from('dsa_subtopics').select('id', { count: 'exact' })
          : Promise.resolve({ count: 0 }),
        hasGate
          ? supabase.from('gate_subtopics').select('id', { count: 'exact' })
          : Promise.resolve({ count: 0 }),
        hasDsa
          ? supabase.from('dsa_problems').select('id').eq('user_id', user.id).eq('is_solved', true)
          : Promise.resolve({ data: [] }),
        // Streak always needed
        supabase.from('tasks').select('date').eq('user_id', user.id).eq('is_completed', true).order('date', { ascending: false }),
        hasFinance
          ? supabase.from('finance_budget').select('*').eq('user_id', user.id).eq('month', currentMonth + '-01').maybeSingle()
          : Promise.resolve({ data: null }),
        hasFinance
          ? supabase.from('finance_entries').select('amount, type').eq('user_id', user.id)
              .gte('date', currentMonth + '-01')
              .lte('date', currentMonth + '-' + String(lastDayOfMonth).padStart(2, '0'))
          : Promise.resolve({ data: [] }),
        (hasDsa || hasGate)
          ? supabase.from('daily_targets').select('*').eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        hasDsa
          ? supabase.from('dsa_problems').select('id').eq('user_id', user.id).eq('date_solved', today).eq('is_solved', true)
          : Promise.resolve({ data: [] }),
        hasGate
          ? supabase.from('user_syllabus_progress').select('id').eq('user_id', user.id).eq('is_completed', true).gte('completed_at', today + 'T00:00:00Z').lte('completed_at', today + 'T23:59:59Z')
          : Promise.resolve({ data: [] }),
        hasDsa
          ? supabase.from('dsa_topics').select('name, category, dsa_subtopics(id, name, order_index)').eq('category', 'basic')
          : Promise.resolve({ data: [] }),
        hasGate
          ? supabase.from('gate_subjects').select('name, gate_subtopics(id, name, order_index)').order('order_index').limit(5)
          : Promise.resolve({ data: [] }),
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('is_completed', false).lte('date', today).order('priority', { ascending: false }),
        hasPlacement
          ? supabase.from('placement_companies').select('status').eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
        hasNotes
          ? supabase.from('daily_notes').select('id').eq('user_id', user.id)
          : Promise.resolve({ data: [] })
      ]);

      const targets = dailyTargetsRes.data || { dsa_goal: 2, gate_goal: 2 };
      setDailyTargets(targets);
      setEditForm(targets);
      setTodayProgress({
        dsa: dsaTodayRes.data?.length || 0,
        gate: gateTodayRes.data?.length || 0
      });
      let allPending = globalPendingRes.data || [];
      // Strip out any hardcoded legacy "Solve X Coding Problems" tasks from the DB fetch
      allPending = allPending.filter(task => !task.title.match(/Solve \d+ Coding Problems/));

      if (hasDsa) {
        const dsaTargetCount = targets.dsa_goal || 2;
        const dsaSolvedCount = dsaTodayRes.data?.length || 0;
        if (dsaSolvedCount < dsaTargetCount) {
          allPending.unshift({
            id: 'virtual_dsa_goal',
            title: `Solve ${dsaTargetCount} Coding Problems`,
            type: 'Daily Target',
            is_syllabus: true,
            is_revision: false,
            is_completed: false,
            is_virtual: true,
            priority: 'high',
            module: 'dsa'
          });
        }
      }
      
      const uniquePendingMap = new Map();
      allPending.forEach(task => {
        if (!uniquePendingMap.has(task.title)) {
          uniquePendingMap.set(task.title, task);
        }
      });
      const deduplicatedPending = Array.from(uniquePendingMap.values());
      setGlobalPendingTasks(deduplicatedPending.slice(0, 5));

      const progress = progressRes.data || [];
      const _completedIds = new Set(progress.filter(p => p.is_completed).map(p => p.dsa_subtopic_id || p.gate_subtopic_id));
      const _scheduledIds = new Set(progress.filter(p => p.target_date === today).map(p => p.dsa_subtopic_id || p.gate_subtopic_id));



      const todayStr = new Date().toISOString().split('T')[0];

      const syllabusTargets = progress
        .filter(p => p.target_date && p.target_date <= today && !p.is_completed)
        .map(p => ({
          id: p.id,
          title: p.dsa_subtopics?.name || p.gate_subtopics?.name || 'Unknown',
          type: p.dsa_subtopic_id ? 'DSA' : 'GATE',
          is_syllabus: true,
          is_overdue: p.target_date < today,
          is_revision: false
        }));

      const due = progress
        .filter(p => p.is_completed && p.next_revision_date && p.next_revision_date <= todayStr)
        .map(p => ({
          id: p.id,
          title: p.dsa_subtopics?.name || p.gate_subtopics?.name || 'Unknown',
          type: p.dsa_subtopic_id ? 'DSA' : 'GATE',
          is_syllabus: true,
          is_revision: true
        }));

      let tasksDataForToday = tasksRes.data || [];
      tasksDataForToday = tasksDataForToday.filter(task => !task.title.match(/Solve \d+ Coding Problems/));
      const completedTodayTasks = tasksDataForToday.filter(t => t.is_completed);
      
      const mergedTasksData = [...deduplicatedPending, ...completedTodayTasks];
      const tasks = mergedTasksData.map(t => ({ ...t, is_syllabus: false }));
      
      const combinedTasks = [...syllabusTargets, ...due, ...tasks];
      
      if (hasDsa) {
        const dsaTargetCount = targets.dsa_goal || 2;
        const dsaSolvedCount = dsaTodayRes.data?.length || 0;
        combinedTasks.unshift({
          id: 'virtual_dsa_goal',
          title: `Solve ${dsaTargetCount} Coding Problems`,
          type: 'Daily Target',
          is_syllabus: true,
          is_revision: false,
          is_completed: dsaSolvedCount >= dsaTargetCount,
          is_virtual: true,
          priority: 'high'
        });
      }

      const uniqueTasksMap = new Map();
      combinedTasks.forEach(item => {
        if (!uniqueTasksMap.has(item.title)) {
          uniqueTasksMap.set(item.title, item);
        }
      });
      const uniqueTasks = Array.from(uniqueTasksMap.values());
      
      setTodayTasks(uniqueTasks);
      setCompletedToday(completedTodayTasks.length);
      setAllDueRevisions(due.map(d => ({ ...d, name: d.title })));

      setDsaStats({ solved: dsaSolvedRes.data?.length || 0, total: dsaCountRes.count || 1 });
      setGateStats({
        completed: progress.filter(p => p.gate_subtopic_id && p.is_completed).length,
        total: gateCountRes.count || 1
      });

      // Streak
      const datesWithCompletions = new Set((completedDatesRes.data || []).map(r => r.date));
      let streak = 0;
      const streakDate = new Date();
      for (let i = 0; i < 365; i++) {
        const ds = `${streakDate.getFullYear()}-${String(streakDate.getMonth() + 1).padStart(2, '0')}-${String(streakDate.getDate()).padStart(2, '0')}`;
        if (datesWithCompletions.has(ds)) { streak++; streakDate.setDate(streakDate.getDate() - 1); }
        else if (i === 0) { streakDate.setDate(streakDate.getDate() - 1); }
        else break;
      }
      setTaskStreak(streak);

      // Finances
      if (hasFinance) {
        const finances = entriesRes.data || [];
        const incomeSum = finances.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
        const expenseSum = finances.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
        setFinanceNetBalance(incomeSum - expenseSum);
      }

      if (hasPlacement) {
        const companies = placementRes.data || [];
        setPlacementStats({
          total: companies.length,
          offers: companies.filter(c => c.status === 'offered').length
        });
      }
      
      if (hasNotes) {
        setNotesCount((notesRes.data || []).length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, today, currentMonth, activeModules]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) loadDashboard();
  }, [user, loadDashboard]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const dsaPct = Math.round((dsaStats.solved / dsaStats.total) * 100);
  const gatePct = Math.round((gateStats.completed / gateStats.total) * 100);
  
  const daysRemaining = Math.ceil((GATE_EXAM_DATE - new Date()) / (1000 * 60 * 60 * 24));

  async function saveTargets() {
    const { data, error } = await supabase
      .from('daily_targets')
      .upsert({ 
        user_id: user.id, 
        dsa_goal: Number(editForm.dsa_goal), 
        gate_goal: Number(editForm.gate_goal),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (!error && data) {
      setDailyTargets(data);
      setIsEditingTargets(false);
    }
  }

  async function removeActivity(activity) {
    if (activity.is_virtual) {
      showToast('This daily target auto-completes when you sync LeetCode stats!');
      return;
    }
    if (activity.is_syllabus) {
      if (activity.is_revision) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await supabase
          .from('user_syllabus_progress')
          .update({ next_revision_date: tomorrow.toISOString().split('T')[0] })
          .eq('id', activity.id);
      } else {
        await supabase
          .from('user_syllabus_progress')
          .update({ target_date: null })
          .eq('id', activity.id);
      }
    } else {
      await supabase
        .from('tasks')
        .update({ date: null })
        .eq('id', activity.id);
    }
    loadDashboard();
  }



  // Handle ticking off a global pending task
  async function handleCompletePendingTask(taskId) {
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: true })
      .eq('id', taskId);
    if (!error) {
      showToast('Task completed! ✓');
      loadDashboard();
    } else {
      showToast(error.message, 'error');
    }
  }

  // AI Quick plan trigger
  const handleAIQuickPlan = () => {
    navigate('/app/ai-manager', {
      state: { autoPrompt: 'Plan my day based on my current tasks' }
    });
  };

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

  // Calculate dynamic stats cards
  const pendingTasksTodayCount = todayTasks.filter(t => !t.is_completed).length;
  const tasksCompletionPct = todayTasks.length > 0 ? Math.round((todayTasks.filter(t => t.is_completed).length / todayTasks.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-10 font-sans">
      
      {/* Header & Greetings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {greeting()}{name ? `, ${name}` : ''}!
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2 mt-1">
            <Timer className="w-4 h-4 text-[#10B981]" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            {taskStreak > 0 && (
              <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 rounded-full text-[10px] font-black text-orange-500 uppercase tracking-widest">
                <Flame className="w-3 h-3" />
                {taskStreak}d streak
              </span>
            )}
          </p>
        </div>
        
        {activeModules.includes('gate') && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-right-4 duration-300">
            <div className="text-right">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">GATE 2027</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{daysRemaining} Days Left</p>
            </div>
            <div className="w-10 h-10 bg-[#10B981] rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Timer className="w-6 h-6" />
            </div>
          </div>
        )}
      </div>

      {/* ── Active Module Stats Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Always Active: Daily Planner */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tasks Today</span>
            <span className="text-sm font-black text-gray-900 dark:text-white">Pending: {pendingTasksTodayCount}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-end">
              <span className="text-xl font-black text-[#10B981]">{tasksCompletionPct}%</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase">{completedToday} / {todayTasks.length} Done</span>
            </div>
            <div className="w-full h-1.5 bg-gray-150 dark:bg-gray-750 rounded-full overflow-hidden">
              <div className="h-full bg-[#10B981] transition-all duration-1000" style={{ width: `${tasksCompletionPct}%` }} />
            </div>
          </div>
        </div>

        {/* Optional: Finance */}
        {activeModules.includes('finance') && (
          <Link
            to="/app/finance"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Finances</span>
              <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-black text-gray-400 uppercase tracking-wider">Month</span>
            </div>
            <div>
              <p className={`text-2xl font-black tracking-tight ${financeNetBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {financeNetBalance >= 0 ? '+' : ''}₹{financeNetBalance.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">Income - Expenses</p>
            </div>
          </Link>
        )}

        {/* Optional: DSA */}
        {activeModules.includes('dsa') && (
          <Link
            to="/app/dsa"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DSA Solved</span>
              <span className="text-[10px] text-orange-500 font-black tracking-wide uppercase">{dsaStats.solved} Problems</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <span className="text-xl font-black text-orange-500">{dsaPct}%</span>
                <span className="text-[10px] text-gray-450 font-bold uppercase">Solved / Total</span>
              </div>
              <div className="w-full h-1.5 bg-gray-150 dark:bg-gray-750 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${dsaPct}%` }} />
              </div>
            </div>
          </Link>
        )}

        {/* Optional: Placement */}
        {activeModules.includes('placement') && (
          <Link
            to="/app/placement"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Placement</span>
              <span className="text-[10px] bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">Pipeline</span>
            </div>
            <div>
              <p className="text-xl font-black text-gray-900 dark:text-white">
                {placementStats.total} <span className="text-sm font-medium text-gray-500">Apps</span>
              </p>
              <p className="text-xs font-bold text-emerald-500 mt-1">{placementStats.offers} Offers</p>
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-1000" 
                style={{ width: `${placementStats.total > 0 ? (placementStats.offers / placementStats.total) * 100 : 0}%` }} 
              />
            </div>
          </Link>
        )}

        {/* Optional: Notes */}
        {activeModules.includes('notes') && (
          <Link
            to="/app/notes"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Notes</span>
              <span className="text-[10px] bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">Entries</span>
            </div>
            <div>
              <p className="text-xl font-black text-gray-900 dark:text-white">
                {notesCount} <span className="text-sm font-medium text-gray-500">Total</span>
              </p>
              <p className="text-xs font-bold text-gray-500 mt-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Capture thoughts
              </p>
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-pink-500 transition-all duration-1000 w-full" />
            </div>
          </Link>
        )}

        {/* Optional: GATE */}
        {activeModules.includes('gate') && (
          <Link
            to="/app/gate"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">GATE Prep</span>
              <span className="text-[10px] text-blue-500 font-black tracking-wide uppercase">{gateStats.completed} Subtopics</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <span className="text-xl font-black text-blue-500">{gatePct}%</span>
                <span className="text-[10px] text-gray-450 font-bold uppercase">Topics Mastered</span>
              </div>
              <div className="w-full h-1.5 bg-gray-150 dark:bg-gray-750 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${gatePct}%` }} />
              </div>
            </div>
          </Link>
        )}

      </div>

      {/* ── Sub-dashboard items ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pending Incomplete Tasks Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white mb-2">Pending Tasks</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Top 5 pending tasks sorted by priority</p>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700/60 flex-1">
            {globalPendingTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">No pending tasks remaining! All caught up.</div>
            ) : (
              globalPendingTasks.map(task => (
                <div key={task.id} className="py-3.5 flex items-center justify-between gap-3 first:pt-0">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => handleCompletePendingTask(task.id)}
                      className="w-4 h-4 rounded text-emerald-500 border-gray-300 dark:border-gray-650 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-250 truncate max-w-[200px]">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-red-50 text-red-500 px-2 py-0.5 rounded uppercase font-black tracking-wide">
                      {task.priority}
                    </span>
                    <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded capitalize font-bold">
                      {task.category || 'General'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Quick Plan Card */}
        <div className="bg-[#111827] rounded-[2rem] p-8 text-white shadow-xl flex flex-col justify-between gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-750" />
          
          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 animate-pulse" /> Smart Scheduling
            </span>
            <h3 className="text-xl font-black tracking-tight leading-tight">AI Planner assistant</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              Create an hour-by-hour planner based on pending tasks, study streaks, and financial status.
            </p>
          </div>

          <button
            onClick={handleAIQuickPlan}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 relative z-10"
          >
            Plan My Day
          </button>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prep Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* GATE Progress Card */}
            {activeModules.includes('gate') && (
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
            )}

            {/* DSA Health Card */}
            {activeModules.includes('dsa') && (
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
            )}
          </div>

          {/* Daily Goals Section */}
          {(activeModules.includes('dsa') || activeModules.includes('gate')) && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#10B981]" />
                  Daily Goals Progress
                </h2>
                <button 
                  onClick={() => setIsEditingTargets(!isEditingTargets)}
                  className="text-xs font-bold text-[#10B981] hover:underline uppercase tracking-widest cursor-pointer"
                >
                  {isEditingTargets ? 'Cancel' : 'Set Targets'}
                </button>
              </div>

              {isEditingTargets ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  {activeModules.includes('dsa') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">DSA Problems Goal</label>
                      <input 
                        type="number" 
                        value={editForm.dsa_goal}
                        onChange={(e) => setEditForm({ ...editForm, dsa_goal: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-650 rounded-xl outline-none focus:ring-2 focus:ring-[#10B981]/20 dark:text-white"
                      />
                    </div>
                  )}
                  {activeModules.includes('gate') && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">GATE Topics Goal</label>
                      <input 
                        type="number" 
                        value={editForm.gate_goal}
                        onChange={(e) => setEditForm({ ...editForm, gate_goal: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-650 rounded-xl outline-none focus:ring-2 focus:ring-[#10B981]/20 dark:text-white"
                      />
                    </div>
                  )}
                  <button 
                    onClick={saveTargets}
                    className="md:col-span-2 py-3 bg-[#10B981] text-white font-bold rounded-xl hover:bg-[#059669] transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Save Daily Goals
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* DSA Progress */}
                  {activeModules.includes('dsa') && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">DSA Problems</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Target: {dailyTargets.dsa_goal} / day</p>
                        </div>
                        <span className="text-sm font-black text-[#10B981]">{todayProgress.dsa}/{dailyTargets.dsa_goal}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#10B981] transition-all duration-1000" 
                          style={{ width: `${Math.min(100, (todayProgress.dsa / dailyTargets.dsa_goal) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  )}

                  {/* GATE Progress */}
                  {activeModules.includes('gate') && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">GATE Subtopics</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Target: {dailyTargets.gate_goal} / day</p>
                        </div>
                        <span className="text-sm font-black text-blue-500">{todayProgress.gate}/{dailyTargets.gate_goal}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-1000" 
                          style={{ width: `${Math.min(100, (todayProgress.gate / dailyTargets.gate_goal) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Today's Tasks List */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-[#10B981]" />
                Daily Action Plan
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {todayTasks.filter(t => t.is_completed).length}/{todayTasks.length} Done
                </span>
                <Link to="/app/calendar" className="text-xs font-bold text-[#10B981] hover:underline uppercase tracking-widest">
                  Manage
                </Link>
              </div>
            </div>
            <div className="p-4 space-y-8">
              {todayTasks.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">No tasks scheduled for today.</p>
                  <button onClick={() => navigate('/app/calendar')} className="mt-3 text-xs font-bold text-[#10B981]">+ Add Task</button>
                </div>
              ) : (
                <>
                  {/* DSA Focus Section */}
                  {activeModules.includes('dsa') && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          DSA Focus
                        </h3>
                      </div>
                      <div className="divide-y divide-gray-50 dark:divide-gray-700/50 border border-gray-55 dark:border-gray-750 rounded-xl overflow-hidden">
                        {todayTasks.filter(t => t.type === 'DSA').map(t => (
                          <ActivityItem key={t.id + (t.is_revision ? '-rev' : '')} t={t} removeActivity={removeActivity} />
                        ))}
                        {todayTasks.filter(t => t.type === 'DSA').length === 0 && (
                          <p className="p-4 text-center text-xs text-gray-400 italic">No DSA focus for today.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* GATE Focus Section */}
                  {activeModules.includes('gate') && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        GATE Preparation
                      </h3>
                      <div className="divide-y divide-gray-50 dark:divide-gray-700/50 border border-gray-55 dark:border-gray-750 rounded-xl overflow-hidden">
                        {todayTasks.filter(t => t.type === 'GATE').map(t => (
                          <ActivityItem key={t.id + (t.is_revision ? '-rev' : '')} t={t} removeActivity={removeActivity} />
                        ))}
                        {todayTasks.filter(t => t.type === 'GATE').length === 0 && (
                          <p className="p-4 text-center text-xs text-gray-400 italic">No GATE focus for today.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* General Tasks Section */}
                  {todayTasks.filter(t => !t.is_syllabus).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Other Tasks
                      </h3>
                      <div className="divide-y divide-gray-50 dark:divide-gray-700/50 border border-gray-55 dark:border-gray-750 rounded-xl overflow-hidden">
                        {todayTasks.filter(t => !t.is_syllabus).map(t => (
                          <ActivityItem key={t.id} t={t} removeActivity={removeActivity} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* Revision Widget */}
          {activeModules.includes('gate') && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
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
          )}

          {/* Quick Actions */}
          <div className="bg-[#111827] rounded-2xl p-6 text-white shadow-xl shadow-black/20">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#10B981]" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link to="/app/calendar" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm">
                Add Task <ChevronRight className="w-4 h-4 opacity-50" />
              </Link>
              {activeModules.includes('dsa') && (
                <Link to="/app/dsa" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm">
                  Log Problem <ChevronRight className="w-4 h-4 opacity-50" />
                </Link>
              )}
              {activeModules.includes('finance') && (
                <Link to="/app/finance" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm">
                  Log Expense <ChevronRight className="w-4 h-4 opacity-50" />
                </Link>
              )}
              {activeModules.includes('placement') && (
                <Link to="/app/placement" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm">
                  Log Company <ChevronRight className="w-4 h-4 opacity-50" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






