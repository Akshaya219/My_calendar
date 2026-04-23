import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { 
  ChevronDown, 
  ChevronRight, 
  Star, 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink,
  Target,
  BookOpen,
  History,
  Clock,
  ClipboardCheck,
  AlertCircle
} from 'lucide-react';
import { markRevisionDone } from '../lib/spacedRepetition';


function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PLATFORMS = ['LeetCode', 'CodeChef', 'GFG', 'HackerRank', 'Codeforces'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const DSA_TOPICS_LIST = ['Arrays', 'Strings', 'LinkedList', 'Trees', 'Graphs', 'DP', 'BinarySearch', 'Sorting', 'Hashing', 'Stack/Queue', 'Greedy', 'Math', 'Backtracking', 'Other'];
const DAILY_TARGET = 3;

const DIFF_STYLE = {
  Easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Hard: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
};

const PLATFORM_COLOR = {
  LeetCode: '#FFA116',
  CodeChef: '#5B4638',
  GFG: '#2F8D46',
  HackerRank: '#00EA64',
  Codeforces: '#1F8ACB',
};

const TABS = [
  { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
  { id: 'revisions', label: 'Revision Queue', icon: Clock },
  { id: 'target', label: 'Daily Target', icon: Target },
  { id: 'log', label: 'Problem Log', icon: History },
];


function emptyForm(today) {
  return { platform: 'LeetCode', problem_title: '', problem_url: '', difficulty: 'Medium', topic: 'Arrays', date_solved: today, is_solved: true, time_taken_mins: '', notes: '' };
}

function Modal({ title, onClose, onSubmit, children, submitLabel = 'Save', loading = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 cursor-pointer transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white cursor-pointer">Cancel</button>
          <button onClick={onSubmit} disabled={loading} className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 cursor-pointer">
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
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <input {...props} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors placeholder-[#9CA3AF]" />
    </div>
  );
}

function FieldSelect({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <select {...props} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors">
        {children}
      </select>
    </div>
  );
}

function Counter({ label, value, onDecrement, onIncrement }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={onDecrement} className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>
        </button>
        <span className="text-xl font-bold text-gray-900 dark:text-white w-6 text-center">{value}</span>
        <button onClick={onIncrement} className="w-7 h-7 rounded-full bg-[#10B981] flex items-center justify-center text-white hover:bg-[#059669] cursor-pointer transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        </button>
      </div>
    </div>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`cursor-pointer transition-colors ${s <= value ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700 hover:text-amber-200'}`}
        >
          <Star className={`w-4 h-4 ${s <= value ? 'fill-current' : ''}`} />
        </button>
      ))}
    </div>
  );
}

function TopicAccordion({ topic, onToggleProgress, onUpdateProgress }) {
  const [isOpen, setIsOpen] = useState(false);
  const completedCount = topic.dsa_subtopics.filter(s => s.user_syllabus_progress?.[0]?.is_completed).length;
  const totalCount = topic.dsa_subtopics.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${isOpen ? 'bg-[#10B981] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{topic.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#10B981] transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {completedCount}/{totalCount} Subtopics
              </span>
            </div>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          topic.category === 'algorithms' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
          topic.category === 'advanced' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        }`}>
          {topic.category}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-800">
          {topic.dsa_subtopics.map((sub) => {
            const progress = sub.user_syllabus_progress?.[0] || {};
            return (
              <div key={sub.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={!!progress.is_completed}
                    onChange={(e) => onToggleProgress(sub.id, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#10B981] focus:ring-[#10B981] cursor-pointer"
                  />
                  <span className={`text-sm ${progress.is_completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                    {sub.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 ml-7 sm:ml-0">
                  <StarRating 
                    value={progress.confidence || 0} 
                    onChange={(val) => onUpdateProgress(sub.id, { confidence: val })}
                  />
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="date"
                      value={progress.target_date || ''}
                      onChange={(e) => onUpdateProgress(sub.id, { target_date: e.target.value || null })}
                      className="text-xs bg-transparent border-none outline-none text-gray-500 dark:text-gray-400 focus:text-[#10B981] cursor-pointer"
                    />
                    {(progress.is_completed || progress.confidence > 0 || progress.target_date) && (
                      <button 
                        onClick={() => onUpdateProgress(sub.id, { is_completed: false, confidence: 0, target_date: null, completed_at: null })}
                        className="ml-1 p-1 text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                        title="Clear Progress"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DSATracker() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const today = localToday();

  const [activeTab, setActiveTab] = useState('syllabus');
  const [syllabus, setSyllabus] = useState([]);
  const [problems, setProblems] = useState([]);
  const [todayTarget, setTodayTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState('All');
  const [filterPlatform, setFilterPlatform] = useState('All');
  const [form, setForm] = useState(emptyForm(today));

  // Set page title
  useEffect(() => {
    document.title = 'DSA Tracker | StudySync';
    return () => { document.title = 'StudySync'; };
  }, []);

  const fetchSyllabus = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Fetch topics with subtopics and progress in one go
    // Note: user_syllabus_progress is automatically filtered by RLS for current user
    const { data } = await supabase
      .from('dsa_topics')
      .select(`
        *,
        dsa_subtopics (
          *,
          user_syllabus_progress (
            is_completed, confidence, target_date, notes, next_revision_date, revision_count
          )
        )
      `)
      .order('order_index');

    
    setSyllabus(data || []);
    setLoading(false);
  }, [user]);

  const fetchProblems = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('dsa_problems')
      .select('*')
      .eq('user_id', user.id)
      .order('date_solved', { ascending: false })
      .order('created_at', { ascending: false });
    setProblems(data || []);
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
    fetchSyllabus();
    fetchProblems();
    fetchOrCreateTodayTarget();
  }, [fetchSyllabus, fetchProblems, fetchOrCreateTodayTarget]);

  const handleSyllabusProgress = async (subtopicId, updates) => {
    const { error } = await supabase
      .from('user_syllabus_progress')
      .upsert({
        user_id: user.id,
        dsa_subtopic_id: subtopicId,
        gate_subtopic_id: null, // Explicitly null for constraint
        ...updates,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,dsa_subtopic_id'
      });

    
    if (error) showToast(error.message, 'error');
    else fetchSyllabus(); // Refresh
  };

  const toggleSyllabusCompletion = async (subtopicId, isCompleted) => {
    const updates = { 
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null
    };
    
    if (isCompleted) {
      // First revision in 1 day
      const d = new Date();
      d.setDate(d.getDate() + 1);
      updates.next_revision_date = d.toISOString().split('T')[0];
      updates.revision_count = 0;
    } else {
      updates.next_revision_date = null;
      updates.revision_count = 0;
    }

    await handleSyllabusProgress(subtopicId, updates);
    if (isCompleted) showToast('Subtopic completed! Revision scheduled.');
  };

  const handleMarkRevised = async (subtopicId, currentProgress) => {
    const updates = markRevisionDone(currentProgress);
    await handleSyllabusProgress(subtopicId, updates);
    showToast(updates.next_revision_date ? `Revision logged! Next: ${updates.next_revision_date}` : 'Mastered! 🎉');
  };


  const updateTargetCount = async (field, delta) => {
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
  };

  const addProblem = async () => {
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
  };

  const deleteProblem = async (id) => {
    await supabase.from('dsa_problems').delete().eq('id', id);
    setProblems((prev) => prev.filter((p) => p.id !== id));
    showToast('Problem deleted');
  };

  const solved = problems.filter((p) => p.is_solved);
  const byDiff = { Easy: 0, Medium: 0, Hard: 0 };
  solved.forEach((p) => { if (byDiff[p.difficulty] !== undefined) byDiff[p.difficulty]++; });

  const todayTotal = (todayTarget?.leetcode_solved || 0) + (todayTarget?.codechef_solved || 0);
  const targetPct = Math.min(100, Math.round((todayTotal / DAILY_TARGET) * 100));

  const filteredLog = problems.filter((p) => {
    const matchSearch = !search || p.problem_title.toLowerCase().includes(search.toLowerCase()) || p.topic?.toLowerCase().includes(search.toLowerCase());
    const matchDiff = filterDiff === 'All' || p.difficulty === filterDiff;
    const matchPlatform = filterPlatform === 'All' || p.platform === filterPlatform;
    return matchSearch && matchDiff && matchPlatform;
  });

  const allSubtopicsWithProgress = syllabus.flatMap(topic => 
    topic.dsa_subtopics.map(sub => ({
      ...sub,
      topic_name: topic.name,
      progress: sub.user_syllabus_progress?.[0]
    }))
  );

  const dueRevisions = allSubtopicsWithProgress.filter(sub => {
    const p = sub.progress;
    if (!p || !p.is_completed || !p.next_revision_date) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return p.next_revision_date <= todayStr;
  });


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">DSA Tracker</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Mastering algorithms & data structures</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Log Problem
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-white dark:bg-gray-700 text-[#10B981] shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'revisions' && dueRevisions.length > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

        ))}
      </div>

      {activeTab === 'syllabus' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900 dark:text-white">Master Syllabus</h2>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> Basic
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" /> Advanced
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500" /> Algorithms
              </div>
            </div>
          </div>
          
          {loading && syllabus.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
            </div>
          ) : syllabus.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl py-12 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Syllabus not loaded. Run the migration 007.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {syllabus.map(topic => (
                <TopicAccordion 
                  key={topic.id} 
                  topic={topic} 
                  onToggleProgress={toggleSyllabusCompletion}
                  onUpdateProgress={handleSyllabusProgress}
                />
              ))}
            </div>
          )}
        </div>
      )}


      {activeTab === 'revisions' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">DSA Revision Queue</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">Spaced Repetition</span>
          </div>

          {dueRevisions.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center py-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                <ClipboardCheck className="w-8 h-8 text-[#10B981]" />
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">All caught up!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No DSA topics are due for revision today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dueRevisions.map(sub => (
                <div key={sub.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest">{sub.progress.revision_count + 1}st Revision Due</span>
                      {sub.progress.next_revision_date < new Date().toISOString().split('T')[0] && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                          <AlertCircle className="w-3 h-3" /> Overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{sub.topic_name}</span>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{sub.name}</h3>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">First studied: {new Date(sub.progress.completed_at).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => handleMarkRevised(sub.id, sub.progress)}
                    className="px-6 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                  >
                    Mark as Revised
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {activeTab === 'target' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{solved.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Solved</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{byDiff.Easy}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Easy</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{byDiff.Medium}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Medium</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-500 dark:text-red-400">{byDiff.Hard}</p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Hard</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Daily Goal</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">Target: {DAILY_TARGET} problems today</p>
              </div>
              {todayTarget?.target_met ? (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl font-bold text-sm border border-emerald-100 dark:border-emerald-800/50">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Target Met!
                </div>
              ) : (
                <span className="text-sm font-bold text-gray-400 dark:text-gray-500">{todayTotal}/{DAILY_TARGET}</span>
              )}
            </div>
            
            <div className="relative h-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-8 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                style={{ width: `${targetPct}%`, backgroundColor: '#10B981' }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <Counter
                  label="LeetCode"
                  value={todayTarget?.leetcode_solved || 0}
                  onDecrement={() => updateTargetCount('leetcode_solved', -1)}
                  onIncrement={() => updateTargetCount('leetcode_solved', 1)}
                />
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <Counter
                  label="CodeChef"
                  value={todayTarget?.codechef_solved || 0}
                  onDecrement={() => updateTargetCount('codechef_solved', -1)}
                  onIncrement={() => updateTargetCount('codechef_solved', 1)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'log' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title or topic…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all"
              />
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {['All', ...DIFFICULTIES].map((d) => (
                <button
                  key={d}
                  onClick={() => setFilterDiff(d)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    filterDiff === d 
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {problems.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center py-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-[#10B981]" />
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">No problems logged yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start your journey by logging your first solve!</p>
              <button onClick={() => setShowModal(true)} className="mt-6 px-6 py-2.5 bg-[#10B981] text-white rounded-xl font-medium hover:bg-[#059669] transition-all cursor-pointer active:scale-95 shadow-sm">
                Log First Problem
              </button>
            </div>
          ) : filteredLog.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-12 text-center text-gray-500">
              No matching problems found.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden shadow-sm">
              {filteredLog.map((p) => (
                <div key={p.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        {p.problem_url ? (
                          <a href={p.problem_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gray-900 dark:text-white hover:text-[#10B981] flex items-center gap-1 group/link">
                            {p.problem_title}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </a>
                        ) : (
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{p.problem_title}</span>
                        )}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${DIFF_STYLE[p.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                        {p.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PLATFORM_COLOR[p.platform] || '#6B7280' }} />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{p.platform}</span>
                      </div>
                      {p.topic && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <BookOpen className="w-3 h-3" />
                          {p.topic}
                        </div>
                      )}
                      {p.time_taken_mins && (
                        <div className="text-xs text-gray-400 font-medium">⏱ {p.time_taken_mins}m</div>
                      )}
                      <div className="text-xs text-gray-400">{p.date_solved}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteProblem(p.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 transition-all text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              {DSA_TOPICS_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
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
