import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { markRevisionDone, getNextRevisionDate, DEFAULT_REVISION_INTERVALS } from '../lib/spacedRepetition';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { 
  ChevronDown, 
  ChevronRight, 
  Star, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  BookOpen, 
  ClipboardCheck, 
  Clock,
  TrendingUp,
  AlertCircle,
  Settings2,
  Bell,
  BellOff,
  RotateCcw,
  X,
} from 'lucide-react';


const GATE_EXAM_DATE = new Date('2027-02-01');

const CONFIDENCE_LABELS = ['', 'Very Low', 'Low', 'Moderate', 'High', 'Very High'];

const TABS = [
  { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
  { id: 'revisions', label: 'Revision Queue', icon: Clock },
  { id: 'mocks', label: 'Mock Tests', icon: ClipboardCheck },
];

// ── Reusable primitives ───────────────────────────────────────────────────────

function Modal({ title, onClose, onSubmit, children, submitLabel = 'Save', loading = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 cursor-pointer transition-colors">
            <X className="w-5 h-5" />
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

function Input({ label, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <input {...props} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors placeholder-[#9CA3AF]" />
    </div>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`cursor-pointer transition-colors ${s <= value ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700 hover:text-amber-200'}`}
        >
          <Star className={`w-4 h-4 ${s <= value ? 'fill-current' : ''}`} />
        </button>
      ))}
      {value > 0 && <span className="text-[10px] text-gray-400 dark:text-gray-500 self-center ml-1 uppercase font-bold">{CONFIDENCE_LABELS[value]}</span>}
    </div>
  );
}

// ── Revision Schedule Panel (custom intervals + notification toggle) ───────────

function RevisionSchedulePanel({ intervals, remindersEnabled, onSave, onClose, saving }) {
  const [localIntervals, setLocalIntervals] = useState([...intervals]);
  const [localReminders, setLocalReminders] = useState(remindersEnabled);

  const updateInterval = (idx, val) => {
    const parsed = Math.max(1, Math.min(999, parseInt(val, 10) || 1));
    setLocalIntervals(prev => prev.map((v, i) => (i === idx ? parsed : v)));
  };

  const addStep = () => {
    const last = localIntervals[localIntervals.length - 1] ?? 7;
    setLocalIntervals(prev => [...prev, Math.min(999, last * 2)]);
  };

  const removeStep = (idx) => {
    if (localIntervals.length <= 1) return; // keep at least 1 step
    setLocalIntervals(prev => prev.filter((_, i) => i !== idx));
  };

  const reset = () => setLocalIntervals([...DEFAULT_REVISION_INTERVALS]);

  const handleSave = () => onSave(localIntervals, localReminders);

  // Notification permission state
  const notifSupported = 'Notification' in window;
  const notifGranted   = notifSupported && Notification.permission === 'granted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#10B981]/10 rounded-lg">
              <Settings2 className="w-4 h-4 text-[#10B981]" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Revision Schedule</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Intervals section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Spaced Repetition Steps</p>
              <button
                onClick={reset}
                className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-[#10B981] transition-colors cursor-pointer uppercase tracking-wide"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Default
              </button>
            </div>

            {/* Visual timeline of steps */}
            <div className="space-y-2">
              {localIntervals.map((days, idx) => (
                <div key={idx} className="flex items-center gap-3 group">
                  {/* Step number + connector */}
                  <div className="flex flex-col items-center w-6 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-[#10B981]/10 border-2 border-[#10B981]/30 flex items-center justify-center">
                      <span className="text-[9px] font-black text-[#10B981]">{idx + 1}</span>
                    </div>
                    {idx < localIntervals.length - 1 && (
                      <div className="w-0.5 h-4 bg-gray-200 dark:bg-gray-700 mt-1" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {idx === 0 ? 'After completion' : `After Revision ${idx}`}
                    </span>
                  </div>

                  {/* Day input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={days}
                      onChange={e => updateInterval(idx, e.target.value)}
                      className="w-16 px-2 py-1.5 text-center text-sm font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors"
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-6">day{days !== 1 ? 's' : ''}</span>
                    <button
                      onClick={() => removeStep(idx)}
                      disabled={localIntervals.length <= 1}
                      className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors rounded"
                      title="Remove step"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview row */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {localIntervals.map((d, i) => (
                <span key={i} className="text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full">
                  Day {localIntervals.slice(0, i + 1).reduce((a, b) => a + b, 0)}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
              Cumulative days from first completion
            </p>

            {/* Add step button */}
            <button
              onClick={addStep}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#10B981] hover:text-[#059669] cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Revision Step
            </button>
          </div>

          {/* Info note */}
          <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Saving will recalculate <strong>all your scheduled revisions</strong> to use the new intervals.
            </p>
          </div>

          {/* Reminder Notifications toggle */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Reminder Notifications</p>
            {!notifSupported && (
              <p className="text-xs text-gray-400 dark:text-gray-500">Browser notifications are not supported.</p>
            )}
            {notifSupported && !notifGranted && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Notification permission not granted. Enable it in your browser settings or via <strong>Settings → Notifications</strong>.
              </p>
            )}
            {notifSupported && notifGranted && (
              <button
                onClick={() => setLocalReminders(r => !r)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  localReminders
                    ? 'border-[#10B981] bg-[#10B981]/5 dark:bg-[#10B981]/10'
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {localReminders
                    ? <Bell className="w-4 h-4 text-[#10B981]" />
                    : <BellOff className="w-4 h-4 text-gray-400" />
                  }
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${localReminders ? 'text-[#10B981]' : 'text-gray-500 dark:text-gray-400'}`}>
                      {localReminders ? 'Reminders On' : 'Reminders Off'}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      Notify me at 8 AM on each revision due date
                    </p>
                  </div>
                </div>
                {/* Toggle pill */}
                <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${localReminders ? 'bg-[#10B981]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${localReminders ? 'left-5' : 'left-0.5'}`} />
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subject Accordion ─────────────────────────────────────────────────────────

function SubjectAccordion({ subject, onToggleProgress, onUpdateProgress }) {
  const [isOpen, setIsOpen] = useState(false);
  const completedCount = subject.gate_subtopics.filter(s => s.user_syllabus_progress?.[0]?.is_completed).length;
  const totalCount = subject.gate_subtopics.length;
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
            <h3 className="font-semibold text-gray-900 dark:text-white">{subject.name}</h3>
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
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase ${
          subject.stream === 'DA' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
          subject.stream === 'CS' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
        }`}>
          {subject.stream}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-800">
          {subject.gate_subtopics.map((sub) => {
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
                        onClick={() => onUpdateProgress(sub.id, { is_completed: false, confidence: 0, target_date: null, completed_at: null, next_revision_date: null, revision_count: 0 })}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GateTracker() {
  const { user, preferences, refreshPreferences } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('syllabus');
  const [selectedStream, setSelectedStream] = useState('ALL');
  const [syllabus, setSyllabus] = useState([]);
  const [mockTests, setMockTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMockModal, setShowMockModal] = useState(false);
  const [savingMock, setSavingMock] = useState(false);
  const [mockForm, setMockForm] = useState({ test_name: '', test_date: new Date().toISOString().split('T')[0], score: '', total_marks: 100, stream: 'DA', remarks: '' });

  // Revision schedule state
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Derive user's current intervals and reminder toggle from preferences
  const userIntervals      = preferences?.gate_revision_intervals ?? DEFAULT_REVISION_INTERVALS;
  const remindersEnabled   = preferences?.gate_reminders_enabled !== false;

  // Set page title
  useEffect(() => {
    document.title = 'GATE Tracker | StudySync';
    return () => { document.title = 'StudySync'; };
  }, []);

  // Listen to Layout top bar event to add mock test
  useEffect(() => {
    const handleContextAction = () => {
      setActiveTab('mocks');
      setShowMockModal(true);
    };
    window.addEventListener('studysync-add-gate', handleContextAction);
    return () => window.removeEventListener('studysync-add-gate', handleContextAction);
  }, []);

  const fetchSyllabus = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('gate_subjects')
      .select(`
        *,
        gate_subtopics (
          *,
          user_syllabus_progress (
            is_completed, confidence, target_date, notes,
            next_revision_date, revision_count, completed_at, revision_dates
          )
        )
      `)
      .order('order_index');
    setSyllabus(data || []);
    setLoading(false);
  }, [user]);

  const fetchMockTests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('gate_mock_tests')
      .select('*')
      .eq('user_id', user.id)
      .order('test_date', { ascending: false });
    setMockTests(data || []);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSyllabus();
    fetchMockTests();
  }, [fetchSyllabus, fetchMockTests]);

  const handleSyllabusProgress = async (subtopicId, updates) => {
    const { error } = await supabase
      .from('user_syllabus_progress')
      .upsert({
        user_id: user.id,
        gate_subtopic_id: subtopicId,
        dsa_subtopic_id: null,
        ...updates,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,gate_subtopic_id'
      });

    if (error) showToast(error.message, 'error');
    else fetchSyllabus();
  };

  const toggleSyllabusCompletion = async (subtopicId, isCompleted) => {
    const updates = { 
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null
    };
    
    if (isCompleted) {
      // Use the user's custom first interval
      const d = new Date();
      d.setDate(d.getDate() + (userIntervals[0] ?? 1));
      updates.next_revision_date = d.toISOString().split('T')[0];
      updates.revision_count = 0;
    } else {
      updates.next_revision_date = null;
      updates.revision_count = 0;
      updates.revision_dates = [];
    }

    await handleSyllabusProgress(subtopicId, updates);
    if (isCompleted) showToast(`Completed! First revision in ${userIntervals[0] ?? 1} day(s).`);
  };

  // ── Save custom revision schedule ─────────────────────────────────────────

  const saveRevisionSchedule = async (newIntervals, newReminders) => {
    if (!user) return;
    setSavingSchedule(true);

    // 1. Save intervals + reminder toggle to user_preferences
    const { error: prefError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        gate_revision_intervals: newIntervals,
        gate_reminders_enabled: newReminders,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (prefError) {
      showToast(prefError.message, 'error');
      setSavingSchedule(false);
      return;
    }

    // 2. Recalculate next_revision_date for all completed GATE topics
    //    so the new schedule takes effect immediately on existing data.
    const { data: allProgress } = await supabase
      .from('user_syllabus_progress')
      .select('id, revision_count, completed_at')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .not('gate_subtopic_id', 'is', null);

    if (allProgress?.length) {
      // Update each row individually using its unique key (user_id, gate_subtopic_id)
      const updatePromises = allProgress.map(p =>
        supabase
          .from('user_syllabus_progress')
          .update({
            next_revision_date: getNextRevisionDate(
              p.completed_at ?? new Date().toISOString(),
              p.revision_count ?? 0,
              newIntervals
            ),
            updated_at: new Date().toISOString(),
          })
          .eq('id', p.id)
      );
      await Promise.all(updatePromises);
    }

    // 3. Refresh auth preferences so userIntervals updates instantly
    await refreshPreferences();
    await fetchSyllabus();

    setSavingSchedule(false);
    setShowSchedulePanel(false);
    showToast('Revision schedule saved! 🎯');
  };

  const addMockTest = async () => {
    if (!mockForm.test_name.trim() || !mockForm.score) return;
    setSavingMock(true);
    const payload = { 
      ...mockForm, 
      test_date: mockForm.test_date || null,
      score: Number(mockForm.score),
      user_id: user.id 
    };
    const { data, error } = await supabase
      .from('gate_mock_tests')
      .insert(payload)
      .select()
      .single();
    setSavingMock(false);
    if (!error && data) {
      setMockTests(prev => [data, ...prev]);
      setShowMockModal(false);
      setMockForm({ test_name: '', test_date: new Date().toISOString().split('T')[0], score: '', total_marks: 100, stream: 'DA', remarks: '' });
      showToast('Mock test added! 📊');
    } else if (error) {
      showToast(error.message, 'error');
    }
  };

  const deleteMockTest = async (id) => {
    await supabase.from('gate_mock_tests').delete().eq('id', id);
    setMockTests(prev => prev.filter(t => t.id !== id));
    showToast('Mock test deleted');
  };

  const handleMarkRevised = async (subtopicId, currentProgress) => {
    const updates = markRevisionDone(currentProgress, userIntervals);
    await handleSyllabusProgress(subtopicId, updates);
    const next = updates.next_revision_date;
    showToast(next ? `Revision logged! Next: ${next}` : 'All revisions complete 🎉');
  };

  // Countdown logic
  const daysRemaining = Math.ceil((GATE_EXAM_DATE - new Date()) / (1000 * 60 * 60 * 24));
  
  // Filter syllabus by stream
  const filteredSyllabus = syllabus.filter(subj => {
    if (selectedStream === 'ALL') return true;
    return subj.stream === selectedStream || subj.stream === 'BOTH';
  });

  // Revisions due
  const allSubtopicsWithProgress = filteredSyllabus.flatMap(s => 
    s.gate_subtopics.map(sub => ({ 
      ...sub, 
      subject_name: s.name, 
      progress: sub.user_syllabus_progress?.[0] 
    }))
  );

  const dueRevisions = allSubtopicsWithProgress.filter(sub => {
    const p = sub.progress;
    if (!p || !p.is_completed || !p.next_revision_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return p.next_revision_date <= today;
  });

  return (
    <div className="space-y-6">
      {/* Countdown Banner */}
      <div className="bg-gradient-to-r from-[#10B981] to-[#3B82F6] rounded-2xl p-6 text-white shadow-lg overflow-hidden relative group">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight">GATE {selectedStream !== 'ALL' ? selectedStream : ''} 2027 COUNTDOWN</h2>
            <p className="text-emerald-100 text-sm font-medium opacity-90 uppercase tracking-widest mt-1">
              {selectedStream === 'ALL' ? 'Combined DA + CS Strategy' : `${selectedStream} Exclusive Strategy`}
            </p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black">{daysRemaining}</span>
            <span className="text-xl font-bold opacity-80 uppercase">Days To Go</span>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />
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

      {/* ── Syllabus Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'syllabus' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Syllabus Overview</h2>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
               <button
                 onClick={() => setSelectedStream('ALL')}
                 className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold transition-colors cursor-pointer ${selectedStream === 'ALL' ? 'bg-white dark:bg-gray-700 text-[#10B981] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
               >ALL</button>
               <button
                 onClick={() => setSelectedStream('CS')}
                 className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold transition-colors cursor-pointer ${selectedStream === 'CS' ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
               >CS</button>
               <button
                 onClick={() => setSelectedStream('DA')}
                 className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold transition-colors cursor-pointer ${selectedStream === 'DA' ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
               >DA</button>
            </div>
          </div>

          {loading && filteredSyllabus.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
            </div>
          ) : syllabus.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl py-12 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Syllabus not loaded. Run migration 007.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredSyllabus.map(subj => (
                <SubjectAccordion 
                  key={subj.id} 
                  subject={subj}
                  onToggleProgress={toggleSyllabusCompletion}
                  onUpdateProgress={handleSyllabusProgress}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Revision Queue Tab ───────────────────────────────────────────── */}
      {activeTab === 'revisions' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Revision Queue</h2>
              {/* Current schedule preview pill row */}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Schedule:</span>
                {userIntervals.map((d, i) => (
                  <span key={i} className="text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full">
                    {d}d
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">Spaced Repetition</span>
              {/* Customize schedule button */}
              <button
                onClick={() => setShowSchedulePanel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg hover:bg-[#10B981]/10 hover:text-[#10B981] transition-all cursor-pointer"
                title="Customize revision schedule"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Customize
              </button>
            </div>
          </div>

          {dueRevisions.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center py-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                <ClipboardCheck className="w-8 h-8 text-[#10B981]" />
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">All caught up!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No topics are due for revision today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dueRevisions.map(sub => (
                <div key={sub.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest">
                        Revision #{sub.progress.revision_count + 1} Due
                      </span>
                      {sub.progress.next_revision_date < new Date().toISOString().split('T')[0] && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                          <AlertCircle className="w-3 h-3" /> Overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{sub.subject_name}</span>
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

      {/* ── Mock Tests Tab ───────────────────────────────────────────────── */}
      {activeTab === 'mocks' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Mock Test Analysis</h2>
            <button
              onClick={() => setShowMockModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981]/10 text-[#10B981] text-xs font-bold rounded-lg hover:bg-[#10B981]/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Test
            </button>
          </div>

          {mockTests.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center py-16 text-center shadow-sm">
              <TrendingUp className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No mock tests logged yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {mockTests.map(test => {
                const pct = Math.round((test.score / test.total_marks) * 100);
                return (
                  <div key={test.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 group">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{test.stream} MOCK</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(test.test_date).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{test.test_name}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-[#10B981]">{test.score}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">/ {test.total_marks}</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${pct >= 50 ? 'bg-emerald-500' : pct >= 25 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${pct >= 50 ? 'text-emerald-500' : pct >= 25 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</span>
                    </div>

                    {test.remarks && <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">"{test.remarks}"</p>}
                    
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex gap-1">
                        {test.weak_areas?.map(area => (
                          <span key={area} className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-500 px-2 py-0.5 rounded-full font-medium">{area}</span>
                        ))}
                      </div>
                      <button 
                        onClick={() => deleteMockTest(test.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}

      {/* Revision Schedule Panel */}
      {showSchedulePanel && (
        <RevisionSchedulePanel
          intervals={userIntervals}
          remindersEnabled={remindersEnabled}
          onSave={saveRevisionSchedule}
          onClose={() => setShowSchedulePanel(false)}
          saving={savingSchedule}
        />
      )}

      {/* Mock Test Modal */}
      {showMockModal && (
        <Modal title="Add Mock Test" onClose={() => setShowMockModal(false)} onSubmit={addMockTest} submitLabel="Save Mock Results" loading={savingMock}>
          <Input 
            label="Test Name *" 
            placeholder="e.g. MADE Easy Full Mock 1" 
            value={mockForm.test_name}
            onChange={e => setMockForm(f => ({ ...f, test_name: e.target.value }))}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Date *" 
              type="date"
              value={mockForm.test_date}
              onChange={e => setMockForm(f => ({ ...f, test_date: e.target.value }))}
            />
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Stream</label>
              <select 
                value={mockForm.stream}
                onChange={e => setMockForm(f => ({ ...f, stream: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 outline-none focus:border-[#10B981] transition-colors"
              >
                <option value="DA">DA (Data Science)</option>
                <option value="CS">CS (Computer Science)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <Input 
              label="Score *" 
              type="number"
              step="0.01"
              placeholder="e.g. 45.5"
              value={mockForm.score}
              onChange={e => setMockForm(f => ({ ...f, score: e.target.value }))}
            />
             <Input 
              label="Total Marks" 
              type="number"
              value={mockForm.total_marks}
              onChange={e => setMockForm(f => ({ ...f, total_marks: e.target.value }))}
            />
          </div>
          <Input 
            label="Remarks / Weak Areas" 
            placeholder="e.g. Weak in Probability, needs revision" 
            value={mockForm.remarks}
            onChange={e => setMockForm(f => ({ ...f, remarks: e.target.value }))}
          />
        </Modal>
      )}
    </div>
  );
}
