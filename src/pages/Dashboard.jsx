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
  Plus,
  RefreshCw,
  Check,
  Calendar
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

function SuggestionItem({ item, type, color, onAccept, onChange }) {
  const colorClass = color === 'orange' ? 'emerald' : 'blue'; // Mapping color names to tailwind colors used in the component
  return (
    <div className={`px-4 py-3 flex items-center gap-4 bg-${colorClass}-50/30 dark:bg-${colorClass}-900/10 border-t border-${colorClass}-50 dark:border-${colorClass}-900/20 group/sug`}>
      <div className={`w-2 h-2 rounded-full bg-${color === 'orange' ? 'orange-400' : 'blue-400'} animate-pulse`} />
      <div className="flex-1 flex flex-col">
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {item.name}
        </span>
        <span className={`text-[10px] font-bold text-${colorClass}-600 dark:text-${colorClass}-400 uppercase tracking-widest flex items-center gap-1`}>
          Suggested: {item.topic}
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover/sug:opacity-100 transition-opacity">
        <button 
          onClick={() => onAccept(item)}
          className={`p-1.5 text-${colorClass}-600 hover:bg-${colorClass}-100 dark:hover:bg-${colorClass}-900/30 rounded-lg cursor-pointer`}
          title="Add to today"
        >
          <Check className="w-4 h-4" />
        </button>
        <button 
          onClick={onChange}
          className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
          title="Change suggestion"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
  const currentMonth = today.slice(0, 7);

  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState([]);
  const [allDueRevisions, setAllDueRevisions] = useState([]);
  const [taskStreak, setTaskStreak] = useState(0);
  const [dsaStats, setDsaStats] = useState({ solved: 0, total: 1 });
  const [gateStats, setGateStats] = useState({ completed: 0, total: 1 });
  const [financeData, setFinanceData] = useState({ budget: 0, spent: 0 });
  const [completedToday, setCompletedToday] = useState(0);
  const [dailyTargets, setDailyTargets] = useState({ dsa_goal: 2, gate_goal: 2 });
  const [todayProgress, setTodayProgress] = useState({ dsa: 0, gate: 0 });
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [editForm, setEditForm] = useState({ dsa_goal: 2, gate_goal: 2 });
  const [suggestions, setSuggestions] = useState({ dsa: null, gate: null });
  const [uncompletedPool, setUncompletedPool] = useState({ dsa: [], gate: [] });

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

    const [
      tasksRes, 
      progressRes, 
      dsaCountRes, 
      gateCountRes, 
      dsaSolvedRes, 
      completedDatesRes, 
      budgetRes, 
      entriesRes,
      dailyTargetsRes,
      dsaTodayRes,
      gateTodayRes,
      dsaAllRes,
      gateAllRes
    ] = await Promise.all([
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
        supabase.from('daily_targets').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('dsa_problems').select('id').eq('user_id', user.id).eq('date_solved', today).eq('is_solved', true),
        supabase.from('user_syllabus_progress').select('id').eq('user_id', user.id).eq('is_completed', true).gte('completed_at', today + 'T00:00:00Z').lte('completed_at', today + 'T23:59:59Z'),
        supabase.from('dsa_topics').select('name, category, dsa_subtopics(id, name, order_index)').eq('category', 'basic'),
        supabase.from('gate_subjects').select('name, gate_subtopics(id, name, order_index)').order('order_index').limit(5)
      ]);

    const targets = dailyTargetsRes.data || { dsa_goal: 2, gate_goal: 2 };
    setDailyTargets(targets);
    setEditForm(targets);
    setTodayProgress({
      dsa: dsaTodayRes.data?.length || 0,
      gate: gateTodayRes.data?.length || 0
    });

    const progress = progressRes.data || [];
    const completedIds = new Set(progress.filter(p => p.is_completed).map(p => p.dsa_subtopic_id || p.gate_subtopic_id));
    const scheduledIds = new Set(progress.filter(p => p.target_date === today).map(p => p.dsa_subtopic_id || p.gate_subtopic_id));

    // Suggestions Pool
    const dsaPool = (dsaAllRes.data || []).flatMap(t => t.dsa_subtopics.map(s => ({ ...s, type: 'DSA', topic: t.name })))
      .filter(s => !completedIds.has(s.id) && !scheduledIds.has(s.id));
    
    const gatePool = (gateAllRes.data || []).flatMap(s => s.gate_subtopics.map(st => ({ ...st, type: 'GATE', topic: s.name })))
      .filter(st => !completedIds.has(st.id) && !scheduledIds.has(st.id));

    setUncompletedPool({ dsa: dsaPool, gate: gatePool });
    
    if (!suggestions.dsa && dsaPool.length > 0) {
      setSuggestions(prev => ({ ...prev, dsa: dsaPool[Math.floor(Math.random() * Math.min(10, dsaPool.length))] }));
    }
    if (!suggestions.gate && gatePool.length > 0) {
      setSuggestions(prev => ({ ...prev, gate: gatePool[Math.floor(Math.random() * Math.min(5, gatePool.length))] }));
    }

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

    const tasks = (tasksRes.data || []).map(t => ({ ...t, is_syllabus: false }));
    setTodayTasks([...syllabusTargets, ...due, ...tasks]);
    setCompletedToday(tasks.filter((t) => t.is_completed).length);
    setAllDueRevisions(due.map(d => ({ ...d, name: d.title })));

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
    if (activity.is_syllabus) {
      if (activity.is_revision) {
        // Postpone revision to tomorrow
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

  async function acceptSuggestion(item) {
    const { error } = await supabase
      .from('user_syllabus_progress')
      .upsert({
        user_id: user.id,
        [item.type === 'DSA' ? 'dsa_subtopic_id' : 'gate_subtopic_id']: item.id,
        [item.type === 'DSA' ? 'gate_subtopic_id' : 'dsa_subtopic_id']: null,
        target_date: today,
        updated_at: new Date().toISOString()
      }, { onConflict: item.type === 'DSA' ? 'user_id,dsa_subtopic_id' : 'user_id,gate_subtopic_id' });
    
    if (!error) {
      setSuggestions(prev => ({ ...prev, [item.type.toLowerCase()]: null }));
      loadDashboard();
    }
  }

  async function addDailyStudyTasks() {
    const tasks = [
      { user_id: user.id, title: 'Solve 3 LeetCode Problems', category: 'dsa', date: today, is_daily_checklist: true, priority: 'high', type: 'DSA' },
      { user_id: user.id, title: 'Solve 3 CodeChef Problems', category: 'dsa', date: today, is_daily_checklist: true, priority: 'high', type: 'DSA' }
    ];
    
    const { error } = await supabase.from('tasks').insert(tasks);
    if (!error) loadDashboard();
  }

  function changeSuggestion(type) {
    const pool = uncompletedPool[type.toLowerCase()];
    if (pool.length > 0) {
      const currentId = suggestions[type.toLowerCase()]?.id;
      const filtered = pool.filter(p => p.id !== currentId);
      const next = filtered[Math.floor(Math.random() * Math.min(10, filtered.length))];
      setSuggestions(prev => ({ ...prev, [type.toLowerCase()]: next }));
    }
  }

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

          {/* Daily Goals Section */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
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
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">DSA Problems Goal</label>
                  <input 
                    type="number" 
                    value={editForm.dsa_goal}
                    onChange={(e) => setEditForm({ ...editForm, dsa_goal: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-[#10B981]/20 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">GATE Topics Goal</label>
                  <input 
                    type="number" 
                    value={editForm.gate_goal}
                    onChange={(e) => setEditForm({ ...editForm, gate_goal: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-[#10B981]/20 dark:text-white"
                  />
                </div>
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

                {/* GATE Progress */}
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
              </div>
            )}
          </div>

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
                <Link to="/app/tasks" className="text-xs font-bold text-[#10B981] hover:underline uppercase tracking-widest">
                  Manage
                </Link>
              </div>
            </div>
            <div className="p-4 space-y-8">
              {todayTasks.length === 0 && !suggestions.dsa && !suggestions.gate ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">No tasks scheduled for today.</p>
                  <button className="mt-3 text-xs font-bold text-[#10B981]">+ Add Task</button>
                </div>
              ) : (
                <>
                  {/* DSA Focus Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        DSA Focus
                      </h3>
                      <button 
                        onClick={addDailyStudyTasks}
                        className="text-[9px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
                      >
                        + Add LeetCode & CodeChef
                      </button>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-700/50 border border-gray-50 dark:border-gray-700/50 rounded-xl overflow-hidden">
                      {todayTasks.filter(t => t.type === 'DSA').map(t => (
                        <ActivityItem key={t.id + (t.is_revision ? '-rev' : '')} t={t} removeActivity={removeActivity} />
                      ))}
                      {suggestions.dsa && todayProgress.dsa < dailyTargets.dsa_goal && (
                        <SuggestionItem 
                          item={suggestions.dsa} 
                          type="DSA" 
                          color="orange" 
                          onAccept={acceptSuggestion} 
                          onChange={() => changeSuggestion('DSA')} 
                        />
                      )}
                      {todayTasks.filter(t => t.type === 'DSA').length === 0 && !suggestions.dsa && (
                        <p className="p-4 text-center text-xs text-gray-400 italic">No DSA focus for today.</p>
                      )}
                    </div>
                  </div>

                  {/* GATE Focus Section */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      GATE Preparation
                    </h3>
                    <div className="divide-y divide-gray-50 dark:divide-gray-700/50 border border-gray-50 dark:border-gray-700/50 rounded-xl overflow-hidden">
                      {todayTasks.filter(t => t.type === 'GATE').map(t => (
                        <ActivityItem key={t.id + (t.is_revision ? '-rev' : '')} t={t} removeActivity={removeActivity} />
                      ))}
                      {suggestions.gate && todayProgress.gate < dailyTargets.gate_goal && (
                        <SuggestionItem 
                          item={suggestions.gate} 
                          type="GATE" 
                          color="blue" 
                          onAccept={acceptSuggestion} 
                          onChange={() => changeSuggestion('GATE')} 
                        />
                      )}
                      {todayTasks.filter(t => t.type === 'GATE').length === 0 && !suggestions.gate && (
                        <p className="p-4 text-center text-xs text-gray-400 italic">No GATE focus for today.</p>
                      )}
                    </div>
                  </div>

                  {/* General Tasks Section */}
                  {todayTasks.filter(t => !t.is_syllabus).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Other Tasks
                      </h3>
                      <div className="divide-y divide-gray-50 dark:divide-gray-700/50 border border-gray-50 dark:border-gray-700/50 rounded-xl overflow-hidden">
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





