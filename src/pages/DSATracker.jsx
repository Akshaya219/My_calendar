import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PLATFORMS = ['LeetCode', 'CodeChef', 'GFG', 'HackerRank', 'Codeforces'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const DSA_TOPICS = ['Arrays', 'Strings', 'LinkedList', 'Trees', 'Graphs', 'DP', 'BinarySearch', 'Sorting', 'Hashing', 'Stack/Queue', 'Greedy', 'Math', 'Backtracking', 'Other'];
const DAILY_TARGET = 3;

const DIFF_STYLE = {
  Easy: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-red-100 text-red-600',
};
const PLATFORM_COLOR = {
  LeetCode: '#FFA116',
  CodeChef: '#5B4638',
  GFG: '#2F8D46',
  HackerRank: '#00EA64',
  Codeforces: '#1F8ACB',
};

function emptyForm(today) {
  return { platform: 'LeetCode', problem_title: '', problem_url: '', difficulty: 'Medium', topic: 'Arrays', date_solved: today, is_solved: true, time_taken_mins: '', notes: '' };
}

function Modal({ title, onClose, onSubmit, children, submitLabel = 'Save', loading = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] sticky top-0 bg-white">
          <h3 className="font-semibold text-[#111827]">{title}</h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#E5E7EB]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#111827] cursor-pointer">Cancel</button>
          <button onClick={onSubmit} disabled={loading} className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 cursor-pointer">
            {loading ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ label, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-[#6B7280] mb-1">{label}</label>}
      <input {...props} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors placeholder-[#9CA3AF]" />
    </div>
  );
}

function FieldSelect({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-[#6B7280] mb-1">{label}</label>}
      <select {...props} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors bg-white">
        {children}
      </select>
    </div>
  );
}

function Counter({ label, value, onDecrement, onIncrement }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#374151] font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={onDecrement} className="w-7 h-7 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] cursor-pointer transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>
        </button>
        <span className="text-xl font-bold text-[#111827] w-6 text-center">{value}</span>
        <button onClick={onIncrement} className="w-7 h-7 rounded-full bg-[#4F46E5] flex items-center justify-center text-white hover:bg-[#4338CA] cursor-pointer transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        </button>
      </div>
    </div>
  );
}

export default function DSATracker() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const today = localToday();

  // Set page title
  useEffect(() => {
    document.title = 'DSA Tracker | StudySync';
    return () => { document.title = 'StudySync'; };
  }, []);

  const [problems, setProblems] = useState([]);
  const [todayTarget, setTodayTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState('All');
  const [filterPlatform, setFilterPlatform] = useState('All');
  const [form, setForm] = useState(emptyForm(today));

  const fetchProblems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('dsa_problems')
      .select('*')
      .eq('user_id', user.id)
      .order('date_solved', { ascending: false })
      .order('created_at', { ascending: false });
    setProblems(data || []);
    setLoading(false);
  }, [user]);

  const fetchOrCreateTodayTarget = useCallback(async () => {
    if (!user) return;
    let { data } = await supabase
      .from('dsa_daily_targets')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (!data) {
      const { data: created } = await supabase
        .from('dsa_daily_targets')
        .insert({ user_id: user.id, date: today, leetcode_solved: 0, codechef_solved: 0, target_met: false })
        .select()
        .single();
      data = created;
    }
    setTodayTarget(data);
  }, [user, today]);

  useEffect(() => {
    fetchProblems();
    fetchOrCreateTodayTarget();
  }, [fetchProblems, fetchOrCreateTodayTarget]);

  async function updateTargetCount(field, delta) {
    if (!todayTarget) return;
    const newVal = Math.max(0, (todayTarget[field] || 0) + delta);
    const lc = field === 'leetcode_solved' ? newVal : (todayTarget.leetcode_solved || 0);
    const cc = field === 'codechef_solved' ? newVal : (todayTarget.codechef_solved || 0);
    const target_met = lc + cc >= DAILY_TARGET;
    const { data } = await supabase
      .from('dsa_daily_targets')
      .update({ [field]: newVal, target_met })
      .eq('id', todayTarget.id)
      .select()
      .single();
    if (data) setTodayTarget(data);
  }

  async function addProblem() {
    if (!form.problem_title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('dsa_problems')
      .insert({ ...form, user_id: user.id, time_taken_mins: form.time_taken_mins ? Number(form.time_taken_mins) : null })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setProblems((prev) => [data, ...prev]);
      setShowModal(false);
      setForm(emptyForm(today));
      showToast('Problem logged! 💻');
    } else if (error) {
      showToast(error.message, 'error');
    }
  }

  async function deleteProblem(id) {
    await supabase.from('dsa_problems').delete().eq('id', id);
    setProblems((prev) => prev.filter((p) => p.id !== id));
    showToast('Problem deleted');
  }

  // Stats
  const solved = problems.filter((p) => p.is_solved);
  const byDiff = { Easy: 0, Medium: 0, Hard: 0 };
  solved.forEach((p) => { if (byDiff[p.difficulty] !== undefined) byDiff[p.difficulty]++; });

  const todayTotal = (todayTarget?.leetcode_solved || 0) + (todayTarget?.codechef_solved || 0);
  const targetPct = Math.min(100, Math.round((todayTotal / DAILY_TARGET) * 100));

  const filtered = problems.filter((p) => {
    const matchSearch = !search || p.problem_title.toLowerCase().includes(search.toLowerCase()) || p.topic?.toLowerCase().includes(search.toLowerCase());
    const matchDiff = filterDiff === 'All' || p.difficulty === filterDiff;
    const matchPlatform = filterPlatform === 'All' || p.platform === filterPlatform;
    return matchSearch && matchDiff && matchPlatform;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111827]">DSA Tracker</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Log Problem
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#111827]">{solved.length}</p>
          <p className="text-xs text-[#6B7280] mt-0.5">Total Solved</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{byDiff.Easy}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Easy</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{byDiff.Medium}</p>
          <p className="text-xs text-amber-600 mt-0.5">Medium</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{byDiff.Hard}</p>
          <p className="text-xs text-red-500 mt-0.5">Hard</p>
        </div>
      </div>

      {/* Today's target panel */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-[#111827]">Today's Target</h2>
            <p className="text-xs text-[#9CA3AF]">Goal: {DAILY_TARGET} problems/day</p>
          </div>
          {todayTarget?.target_met ? (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Target Met!
            </span>
          ) : (
            <span className="text-sm text-[#6B7280]">{todayTotal}/{DAILY_TARGET} done</span>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-[#F3F4F6] rounded-full mb-4 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${targetPct}%`, background: todayTarget?.target_met ? '#10B981' : '#4F46E5' }}
          />
        </div>
        <div className="space-y-3">
          <Counter
            label="LeetCode"
            value={todayTarget?.leetcode_solved || 0}
            onDecrement={() => updateTargetCount('leetcode_solved', -1)}
            onIncrement={() => updateTargetCount('leetcode_solved', 1)}
          />
          <Counter
            label="CodeChef"
            value={todayTarget?.codechef_solved || 0}
            onDecrement={() => updateTargetCount('codechef_solved', -1)}
            onIncrement={() => updateTargetCount('codechef_solved', 1)}
          />
        </div>
      </div>

      {/* Problem log */}
      <div>
        <h2 className="font-semibold text-[#111827] mb-3">Problem Log</h2>
        {/* Search & filters */}
        <div className="flex gap-2 flex-wrap mb-3">
          <div className="relative flex-1 min-w-48">
            <svg className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search problems…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
            />
          </div>
          <div className="flex gap-1">
            {['All', ...DIFFICULTIES].map((d) => (
              <button
                key={d}
                onClick={() => setFilterDiff(d)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${filterDiff === d ? 'bg-[#4F46E5] text-white' : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6]">
            {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl flex flex-col items-center justify-center py-12 text-center">
            <svg className="w-10 h-10 text-[#E5E7EB] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
            <p className="text-sm font-medium text-[#6B7280]">No problems logged yet</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-[#4F46E5] font-medium hover:underline cursor-pointer">
              + Log your first problem
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6]">
            {filtered.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-start gap-3 hover:bg-[#F9FAFB] transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.problem_url ? (
                      <a href={p.problem_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#111827] hover:text-[#4F46E5] transition-colors">
                        {p.problem_title}
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-[#111827]">{p.problem_title}</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${DIFF_STYLE[p.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                      {p.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: (PLATFORM_COLOR[p.platform] || '#6B7280') + '20', color: PLATFORM_COLOR[p.platform] || '#6B7280' }}>
                      {p.platform}
                    </span>
                    {p.topic && <span className="text-xs text-[#9CA3AF]">{p.topic}</span>}
                    {p.time_taken_mins && <span className="text-xs text-[#9CA3AF]">⏱ {p.time_taken_mins}m</span>}
                    <span className="text-xs text-[#9CA3AF]">{p.date_solved}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteProblem(p.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#9CA3AF] hover:text-red-500 cursor-pointer shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add problem modal */}
      {showModal && (
        <Modal title="Log Problem" onClose={() => setShowModal(false)} onSubmit={addProblem} submitLabel="Log Problem" loading={saving}>
          <FieldInput
            label="Problem Title *"
            type="text"
            placeholder="e.g. Two Sum"
            value={form.problem_title}
            onChange={(e) => setForm((f) => ({ ...f, problem_title: e.target.value }))}
            autoFocus
          />
          <FieldInput
            label="Problem URL"
            type="url"
            placeholder="https://leetcode.com/problems/..."
            value={form.problem_url}
            onChange={(e) => setForm((f) => ({ ...f, problem_url: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldSelect label="Platform" value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </FieldSelect>
            <FieldSelect label="Difficulty" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </FieldSelect>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldSelect label="Topic" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}>
              {DSA_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </FieldSelect>
            <FieldInput
              label="Time Taken (mins)"
              type="number"
              min="1"
              placeholder="e.g. 25"
              value={form.time_taken_mins}
              onChange={(e) => setForm((f) => ({ ...f, time_taken_mins: e.target.value }))}
            />
          </div>
          <FieldInput
            label="Date Solved"
            type="date"
            value={form.date_solved}
            onChange={(e) => setForm((f) => ({ ...f, date_solved: e.target.value }))}
          />
          <FieldInput
            label="Notes"
            type="text"
            placeholder="Key insight or approach"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </Modal>
      )}
    </div>
  );
}
