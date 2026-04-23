import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getDueRevisions, getNextRevisionDate, markRevisionDone } from '../lib/spacedRepetition';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

const PRESET_SUBJECTS = ['Mathematics', 'Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Computer Networks', 'Digital Logic', 'COA'];
const CONFIDENCE_LABELS = ['', 'Very Low', 'Low', 'Moderate', 'High', 'Very High'];
const VIEWS = { TOPICS: 'topics', REVISIONS: 'revisions' };

function Modal({ title, onClose, onSubmit, children, submitLabel = 'Save', loading = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:text-gray-400 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white cursor-pointer">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <input {...props} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors placeholder-[#9CA3AF]" />
    </div>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`text-xl cursor-pointer transition-colors ${s <= value ? 'text-amber-400' : 'text-[#E5E7EB]'}`}
        >
          ★
        </button>
      ))}
      {value > 0 && <span className="text-xs text-gray-500 dark:text-gray-400 self-center ml-1">{CONFIDENCE_LABELS[value]}</span>}
    </div>
  );
}

export default function GateTracker() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Set page title
  useEffect(() => {
    document.title = 'GATE Tracker | StudySync';
    return () => { document.title = 'StudySync'; };
  }, []);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSubject, setActiveSubject] = useState('All');
  const [activeView, setActiveView] = useState(VIEWS.TOPICS);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ subject: '', topic: '', notes: '', confidence_level: 3 });

  const fetchTopics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('gate_topics')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTopics(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  async function addTopic() {
    if (!form.subject.trim() || !form.topic.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('gate_topics')
      .insert({ ...form, user_id: user.id })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setTopics((prev) => [data, ...prev]);
      setShowModal(false);
      setForm({ subject: '', topic: '', notes: '', confidence_level: 3 });
      showToast('Topic added!');
    } else if (error) {
      showToast(error.message, 'error');
    }
  }

  async function markComplete(topic) {
    const now = new Date().toISOString();
    const nextDate = getNextRevisionDate(now, 0);
    const { data } = await supabase
      .from('gate_topics')
      .update({ is_completed: true, completed_at: now, next_revision_date: nextDate, revision_count: 0, revision_dates: [] })
      .eq('id', topic.id)
      .select()
      .single();
    if (data) {
      setTopics((prev) => prev.map((t) => (t.id === topic.id ? data : t)));
      showToast(`Completed! First revision due on ${nextDate}`);
    }
  }

  async function handleMarkRevised(topic) {
    const updates = markRevisionDone(topic);
    const { data } = await supabase
      .from('gate_topics')
      .update(updates)
      .eq('id', topic.id)
      .select()
      .single();
    if (data) {
      setTopics((prev) => prev.map((t) => (t.id === topic.id ? data : t)));
      const next = updates.next_revision_date;
      showToast(next ? `Revision logged! Next: ${next}` : 'All revisions complete 🎉');
    }
  }

  async function updateConfidence(topic, level) {
    const { data } = await supabase
      .from('gate_topics')
      .update({ confidence_level: level })
      .eq('id', topic.id)
      .select()
      .single();
    if (data) setTopics((prev) => prev.map((t) => (t.id === topic.id ? data : t)));
  }

  async function deleteTopic(id) {
    await supabase.from('gate_topics').delete().eq('id', id);
    setTopics((prev) => prev.filter((t) => t.id !== id));
    showToast('Topic deleted');
  }

  const subjects = ['All', ...new Set(topics.map((t) => t.subject).filter(Boolean))];
  const dueRevisions = getDueRevisions(topics);

  const filteredTopics = topics
    .filter((t) => activeSubject === 'All' || t.subject === activeSubject)
    .filter((t) => !search || t.topic.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase()));

  // Progress per subject
  const subjectProgress = {};
  subjects.filter((s) => s !== 'All').forEach((s) => {
    const sub = topics.filter((t) => t.subject === s);
    subjectProgress[s] = sub.length > 0 ? Math.round((sub.filter((t) => t.is_completed).length / sub.length) * 100) : 0;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">GATE Tracker</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Topic
        </button>
      </div>

      {/* View switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView(VIEWS.TOPICS)}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${activeView === VIEWS.TOPICS ? 'bg-[#10B981] text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
        >
          Topics
        </button>
        <button
          onClick={() => setActiveView(VIEWS.REVISIONS)}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${activeView === VIEWS.REVISIONS ? 'bg-[#10B981] text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
        >
          Revision Queue
          {dueRevisions.length > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeView === VIEWS.REVISIONS ? 'bg-white dark:bg-gray-800 text-[#10B981]' : 'bg-red-500 text-white'}`}>
              {dueRevisions.length}
            </span>
          )}
        </button>
      </div>

      {activeView === VIEWS.TOPICS ? (
        <>
          {/* Subject filter pills + progress */}
          <div className="flex gap-2 flex-wrap">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSubject(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  activeSubject === s ? 'bg-[#10B981] text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                {s}
                {s !== 'All' && (
                  <span className={`text-xs ${activeSubject === s ? 'text-emerald-200' : 'text-gray-400 dark:text-gray-500'}`}>
                    {subjectProgress[s]}%
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search topics…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors"
            />
          </div>

          {/* Topics list */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                  <SkeletonRow />
                </div>
              ))}
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-10 h-10 text-[#E5E7EB] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No topics yet</p>
              <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-[#10B981] font-medium hover:underline cursor-pointer">
                + Add your first topic
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTopics.map((t) => (
                <div key={t.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 group hover:border-[#C7D2FE] transition-colors">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => !t.is_completed && markComplete(t)}
                      title={t.is_completed ? 'Completed' : 'Mark as completed'}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                        t.is_completed ? 'bg-emerald-500 border-emerald-500 cursor-default' : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500 cursor-pointer'
                      }`}
                    >
                      {t.is_completed && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${t.is_completed ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{t.topic}</p>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#EEF2FF] text-[#10B981]">{t.subject}</span>
                        {t.is_completed && t.next_revision_date && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Next: {t.next_revision_date}</span>
                        )}
                      </div>
                      {t.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{t.notes}</p>}
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            onClick={() => updateConfidence(t, s)}
                            className={`text-base leading-none cursor-pointer transition-colors ${s <= (t.confidence_level || 0) ? 'text-amber-400' : 'text-[#E5E7EB] hover:text-amber-200'}`}
                          >
                            ★
                          </button>
                        ))}
                        {t.revision_count > 0 && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{t.revision_count} revisions</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTopic(t.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500 hover:text-red-500 cursor-pointer shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Revision Queue */
        <div className="space-y-3">
          {dueRevisions.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">🎉</span>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No revisions due today!</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Great job staying on top of your studies.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">{dueRevisions.length} topic{dueRevisions.length > 1 ? 's' : ''} due for revision today.</p>
              {dueRevisions.map((t) => (
                <div key={t.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.topic}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-[#EEF2FF] text-[#10B981]">{t.subject}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">Revision #{(t.revision_count || 0) + 1}</span>
                      <span className="text-xs text-red-500">Due: {t.next_revision_date}</span>
                    </div>
                    <div className="flex gap-0.5 mt-1.5">
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} className={`text-sm ${s <= (t.confidence_level||0) ? 'text-amber-400' : 'text-[#E5E7EB]'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkRevised(t)}
                    className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Revised ✓
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Add topic modal */}
      {showModal && (
        <Modal title="Add Topic" onClose={() => setShowModal(false)} onSubmit={addTopic} submitLabel="Add Topic" loading={saving}>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subject *</label>
            <input
              type="text"
              list="subjects-list"
              placeholder="e.g. Data Structures"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors placeholder-[#9CA3AF]"
            />
            <datalist id="subjects-list">
              {PRESET_SUBJECTS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <Input
            label="Topic Name *"
            type="text"
            placeholder="e.g. AVL Trees"
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            autoFocus
          />
          <Input
            label="Notes"
            type="text"
            placeholder="Optional notes or key formulas"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Confidence Level</label>
            <StarRating value={form.confidence_level} onChange={(v) => setForm((f) => ({ ...f, confidence_level: v }))} />
          </div>
        </Modal>
      )}
    </div>
  );
}
