import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { SkeletonRow } from '../components/ui/Skeleton';
import {
  Briefcase,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  ClipboardList,
  Target,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const CHECKLIST_ITEMS = [
  { key: 'dsa_ready', label: 'DSA Concepts Mastered (Arrays, Graphs, DP)' },
  { key: 'resume_updated', label: 'Resume Tailored & GitHub Projects Linked' },
  { key: 'mock_interviews', label: 'Completed 3+ Mock Technical Interviews' },
  { key: 'dbms_os_core', label: 'Core CS Concepts Refreshed (DBMS, OS, OOPs)' },
  { key: 'behavioral_prep', label: 'Behavioral Answers Prepared (STAR Method)' },
  { key: 'profiles_ready', label: 'LinkedIn, LeetCode & Portfolio Portals Active' }
];

export default function PlacementPrep() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [checklist, setChecklist] = useState({});
  const [placementTasks, setPlacementTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Add Company Modal State
  const [showModal, setShowModal] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [form, setForm] = useState({ company_name: '', role: '', deadline: '', status: 'interested' });

  // Listen to Layout top bar event to add company
  useEffect(() => {
    const handleContextAction = () => setShowModal(true);
    window.addEventListener('studysync-add-company', handleContextAction);
    return () => window.removeEventListener('studysync-add-company', handleContextAction);
  }, []);

  useEffect(() => {
    document.title = 'Placement Prep | StudySync';
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [companiesRes, checklistRes, tasksRes] = await Promise.all([
        supabase.from('placement_companies').select('*').eq('user_id', user.id).order('deadline', { ascending: true }),
        supabase.from('placement_checklist').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('category', 'placement')
      ]);

      setCompanies(companiesRes.data || []);
      
      // Map checklist items to dictionary
      const checklistDict = {};
      (checklistRes.data || []).forEach(item => {
        checklistDict[item.item_key] = item.is_checked;
      });
      setChecklist(checklistDict);
      
      setPlacementTasks(tasksRes.data || []);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Handle Checklist Change
  const handleToggleChecklist = async (key, checked) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('placement_checklist')
        .upsert({
          user_id: user.id,
          item_key: key,
          is_checked: checked,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,item_key' });

      if (error) throw error;
      setChecklist(prev => ({ ...prev, [key]: checked }));
      showToast('Milestone status updated!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Add Company
  const handleAddCompany = async () => {
    if (!form.company_name.trim() || !form.role.trim()) return;
    setSavingCompany(true);
    try {
      const { data, error } = await supabase
        .from('placement_companies')
        .insert({
          ...form,
          deadline: form.deadline || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      setCompanies(prev => [...prev, data]);
      setShowModal(false);
      setForm({ company_name: '', role: '', deadline: '', status: 'interested' });
      showToast('Target company logged successfully! 🎯');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingCompany(false);
    }
  };

  // Delete Company
  const handleDeleteCompany = async (id) => {
    try {
      const { error } = await supabase.from('placement_companies').delete().eq('id', id);
      if (error) throw error;
      setCompanies(prev => prev.filter(c => c.id !== id));
      showToast('Target company removed');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Update Company Status
  const handleStatusChange = async (id, nextStatus) => {
    try {
      const { error } = await supabase
        .from('placement_companies')
        .update({ status: nextStatus })
        .eq('id', id);

      if (error) throw error;
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
      showToast('Application milestone saved.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // AI Roadmap trigger
  const handleGetAiRoadmap = () => {
    // Navigate to AI Manager and pass custom query state
    navigate('/app/ai-manager', {
      state: {
        autoPrompt: 'Generate a comprehensive placement preparation roadmap for me. Focus on my target companies, DSA practice level, and core CS milestones.'
      }
    });
  };

  const completedChecklistCount = CHECKLIST_ITEMS.filter(item => checklist[item.key]).length;
  const progressPct = Math.round((completedChecklistCount / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className="space-y-8 pb-20">
      
      {/* ── Callout AI Roadmap banner ── */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-tight">PLACEMENT CRASH STRATEGY</h2>
            <p className="text-purple-100 text-xs font-bold uppercase tracking-wider">
              B.Tech AI & DS interview accelerator
            </p>
          </div>
          <button
            onClick={handleGetAiRoadmap}
            className="flex items-center gap-1.5 px-5 py-3 bg-white text-purple-700 hover:bg-purple-50 text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            Get AI Roadmap
          </button>
        </div>
        
        {/* Glow circles */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-56 h-56 bg-white/10 rounded-full blur-3xl transition-all duration-700" />
      </div>

      {/* ── Key Placement Tracker Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Progress Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Mastery Level</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">{progressPct}%</span>
          </div>
          <div className="mt-4 space-y-2">
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase">
              {completedChecklistCount} of {CHECKLIST_ITEMS.length} milestones checked
            </p>
          </div>
        </div>

        {/* Company counts */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Channels</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {companies.filter(c => ['applied', 'interviewing'].includes(c.status)).length}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium">
            Active applications out of {companies.length} logged companies
          </p>
        </div>

        {/* Pending task count */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Placement Tasks</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {placementTasks.filter(t => !t.is_completed).length}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium">
            Pending placement actions in your planner
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ── Left Grid: Companies & Tasks ── */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Target Companies */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-150 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" /> Target Companies
              </h3>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-purple-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Log Target
              </button>
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && companies.length === 0 ? (
                [1, 2, 3].map(i => <SkeletonRow key={i} />)
              ) : companies.length === 0 ? (
                <div className="py-16 text-center">
                  <Briefcase className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No target companies logged</p>
                </div>
              ) : (
                companies.map((c) => (
                  <div key={c.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{c.company_name}</h4>
                        <span className="text-xs text-gray-450 font-semibold">{c.role}</span>
                      </div>
                      {c.deadline && (
                        <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> Deadline: {c.deadline}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0 sm:ml-auto">
                      {/* Status select options */}
                      <select
                        value={c.status}
                        onChange={(e) => handleStatusChange(c.id, e.target.value)}
                        className={`text-xs px-3 py-1.5 border rounded-xl font-bold uppercase tracking-wider outline-none cursor-pointer bg-white dark:bg-gray-800 ${
                          c.status === 'offer' ? 'border-emerald-300 text-emerald-600 dark:border-emerald-950 dark:text-emerald-400 bg-emerald-50/30' :
                          c.status === 'rejected' ? 'border-red-300 text-red-600 dark:border-red-950 dark:text-red-400 bg-red-50/30' :
                          c.status === 'interviewing' ? 'border-blue-300 text-blue-600 dark:border-blue-950 dark:text-blue-400 bg-blue-50/30' :
                          c.status === 'applied' ? 'border-amber-300 text-amber-600 dark:border-amber-950 dark:text-amber-400 bg-amber-50/30' :
                          'border-gray-200 text-gray-500'
                        }`}
                      >
                        <option value="interested">Interested</option>
                        <option value="applied">Applied</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="offer">Offer 🎉</option>
                        <option value="rejected">Rejected</option>
                      </select>

                      <button
                        onClick={() => handleDeleteCompany(c.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Placement Tasks */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-150 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Placement Checklist (Tasks)</h3>
              <button
                onClick={() => navigate('/app/calendar')}
                className="text-xs font-bold text-purple-600 hover:underline uppercase tracking-wider cursor-pointer"
              >
                Go to Planner
              </button>
            </div>
            
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {placementTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 italic">
                  No tasks categorized as "placement". Go to planner and set task category to placement.
                </div>
              ) : (
                placementTasks.map(t => (
                  <li key={t.id} className="p-4 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${t.is_completed ? 'bg-gray-300' : 'bg-purple-500'}`} />
                    <span className={`text-sm font-semibold truncate ${t.is_completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-250'}`}>
                      {t.title}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase font-black ml-auto shrink-0">{t.date}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

        </div>

        {/* ── Right Grid: Checklist milestones ── */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <ClipboardList className="w-5 h-5 text-purple-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-950 dark:text-white">Preparation Benchmarks</h3>
            </div>

            <div className="space-y-4">
              {CHECKLIST_ITEMS.map((item) => {
                const isChecked = !!checklist[item.key];
                return (
                  <label key={item.key} className="flex items-start gap-3.5 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleToggleChecklist(item.key, e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-purple-600 border-gray-300 dark:border-gray-750 focus:ring-purple-500 focus:ring-2 cursor-pointer"
                    />
                    <span className={`text-xs font-semibold leading-relaxed transition-all ${
                      isChecked ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200 group-hover:text-purple-600'
                    }`}>
                      {item.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Target company modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="font-semibold text-gray-900 dark:text-white">Log Target Company</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500 cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Company Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Google"
                  value={form.company_name}
                  onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-750 rounded-xl text-sm outline-none focus:border-purple-500 dark:bg-gray-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Role / Position *</label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer (ML)"
                  value={form.role}
                  onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-750 rounded-xl text-sm outline-none focus:border-purple-500 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-750 rounded-xl text-sm outline-none focus:border-purple-500 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-750 rounded-xl text-sm outline-none focus:border-purple-500 bg-white dark:bg-gray-900 dark:text-white"
                  >
                    <option value="interested">Interested</option>
                    <option value="applied">Applied</option>
                    <option value="interviewing">Interviewing</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 cursor-pointer">Cancel</button>
              <button
                onClick={handleAddCompany}
                disabled={savingCompany}
                className="px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60"
              >
                {savingCompany ? 'Saving…' : 'Save Company'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
