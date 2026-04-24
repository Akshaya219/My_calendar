import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import CalendarView from '../components/CalendarView';
import { requestPermission, scheduleLocalReminder } from '../lib/notifications';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PRIORITIES = ['low', 'medium', 'high'];
const CATEGORIES = ['placement', 'gate', 'dsa', 'personal', 'finance', 'exam'];
const PRIORITY_COLOR = { low: '#10B981', medium: '#F59E0B', high: '#EF4444' };
const PRIORITY_BG = { low: 'bg-emerald-100 text-emerald-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-red-100 text-red-600' };

function emptyForm(date) {
  return {
    title: '',
    description: '',
    date,
    time: '',
    priority: 'medium',
    category: 'personal',
    is_daily_checklist: false,
    // Reminder fields (not persisted directly — combined into reminder_at on save)
    reminder_enabled: false,
    reminder_time: '',
  };
}

function Modal({ title, onClose, onSubmit, children, submitLabel = 'Save', loading = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:text-gray-400 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors cursor-pointer">Cancel</button>
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
      <input
        {...props}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors placeholder-[#9CA3AF]"
      />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <select
        {...props}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors bg-white dark:bg-gray-800"
      >
        {children}
      </select>
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const today = localToday();

  // Set page title
  useEffect(() => {
    document.title = 'Calendar | StudySync';
    return () => { document.title = 'StudySync'; };
  }, []);

  const [selectedDate, setSelectedDate] = useState(today);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm(today));
  const [refreshCalendar, setRefreshCalendar] = useState(0);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    // 1. Fetch Regular Tasks
    const { data: taskData } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', selectedDate)
      .order('is_daily_checklist', { ascending: false })
      .order('time', { ascending: true, nullsFirst: false });

    // 2. Fetch Syllabus Events for this date
    const { data: progressData } = await supabase
      .from('user_syllabus_progress')
      .select(`
        target_date, 
        next_revision_date, 
        is_completed,
        dsa_subtopic_id,
        gate_subtopic_id,
        dsa_subtopics(name),
        gate_subtopics(name)
      `)
      .eq('user_id', user.id)
      .or(`target_date.eq.${selectedDate},next_revision_date.eq.${selectedDate}`);

    const combined = [...(taskData || [])];

    progressData?.forEach(p => {
      const name = p.dsa_subtopics?.name || p.gate_subtopics?.name || 'Syllabus Topic';
      const subtopic_id = p.dsa_subtopic_id || p.gate_subtopic_id;
      const type = p.dsa_subtopic_id ? 'DSA' : 'GATE';
      
      if (p.target_date === selectedDate) {
        combined.push({
          id: `target-${subtopic_id}`,
          subtopic_id,
          type,
          title: `Target: ${name}`,
          is_completed: p.is_completed,
          priority: 'medium',
          category: 'syllabus',
          is_external: false,
          task_type: 'target'
        });
      }
      if (p.next_revision_date === selectedDate) {
        combined.push({
          id: `rev-${subtopic_id}`,
          subtopic_id,
          type,
          title: `Revise: ${name}`,
          is_completed: false,
          priority: 'high',
          category: 'revision',
          is_external: false,
          task_type: 'revision'
        });
      }
    });

    setTasks(combined);
    setLoading(false);
  }, [user, selectedDate]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]); // eslint-disable-line react-hooks/set-state-in-effect


  function shiftDate(days) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }

  async function toggleComplete(task) {
    if (task.is_external) {
      showToast('Please update syllabus progress in the Tracker tabs', 'info');
      return;
    }

    const isSyllabusTask = !!task.subtopic_id;
    const newStatus = !task.is_completed;

    if (isSyllabusTask) {
      // 1. Handle Syllabus / Revision Task Sync
      const updates = { 
        is_completed: newStatus,
        completed_at: newStatus ? new Date().toISOString() : null
      };
      
      if (newStatus) {
        // Initialize spaced repetition on completion
        const d = new Date();
        d.setDate(d.getDate() + 1);
        updates.next_revision_date = d.toISOString().split('T')[0];
        updates.revision_count = 0;
      }

      const { error } = await supabase
        .from('user_syllabus_progress')
        .upsert({
          user_id: user.id,
          [task.type === 'DSA' ? 'dsa_subtopic_id' : 'gate_subtopic_id']: task.subtopic_id,
          [task.type === 'DSA' ? 'gate_subtopic_id' : 'dsa_subtopic_id']: null,
          ...updates,
          updated_at: new Date().toISOString()
        }, { onConflict: task.type === 'DSA' ? 'user_id,dsa_subtopic_id' : 'user_id,gate_subtopic_id' });

      if (!error) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_completed: newStatus } : t)));
        if (newStatus) showToast(task.task_type === 'revision' ? 'Revision logged!' : 'Topic completed! Revision scheduled.');
      } else {
        showToast(error.message, 'error');
      }
    } else {
      // 2. Handle Regular Task
      const { data, error } = await supabase
        .from('tasks')
        .update({ is_completed: newStatus })
        .eq('id', task.id)
        .select()
        .single();

      if (data && !error) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
        
        // SYNC: Update daily counts if it's a study goal checklist item
        if (task.is_daily_checklist && newStatus) {
          if (task.title.includes('LeetCode')) {
            const { data: dTarget } = await supabase.from('dsa_daily_targets').select('*').eq('user_id', user.id).eq('date', today).maybeSingle();
            if (dTarget) {
               const leetcode_solved = (dTarget.leetcode_solved || 0) + 3;
               await supabase.from('dsa_daily_targets').update({ leetcode_solved }).eq('id', dTarget.id);
            }
          } else if (task.title.includes('CodeChef')) {
            const { data: dTarget } = await supabase.from('dsa_daily_targets').select('*').eq('user_id', user.id).eq('date', today).maybeSingle();
            if (dTarget) {
               const codechef_solved = (dTarget.codechef_solved || 0) + 3;
               await supabase.from('dsa_daily_targets').update({ codechef_solved }).eq('id', dTarget.id);
            }
          }
        }
        if (newStatus) showToast('Task completed ✓');
      } else if (error) {
        showToast(error.message, 'error');
      }
    }
  }


  async function deleteTask(id) {
    if (String(id).startsWith('target-') || String(id).startsWith('rev-')) {
      showToast('Syllabus targets cannot be deleted here', 'error');
      return;
    }
    await supabase.from('tasks').delete().eq('id', id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setRefreshCalendar(r => r + 1);
    showToast('Task deleted');
  }


  async function addTask() {
    if (!form.title.trim()) return;
    setSaving(true);

    // Build the payload — strip UI-only reminder fields before inserting
    const { reminder_enabled, reminder_time, ...rest } = form;

    // Compute reminder_at: combine task date + reminder_time into ISO timestamp
    let reminder_at = null;
    let hasPermission = false;
    if (reminder_enabled && reminder_time && rest.date) {
      reminder_at = new Date(`${rest.date}T${reminder_time}:00`).toISOString();
      const perm = await requestPermission();
      hasPermission = perm === 'granted';
    }

    const payload = { ...rest, user_id: user.id, reminder_at, reminder_sent: false };
    if (!payload.time) payload.time = null;

    const { data, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      if (data.date === selectedDate) setTasks((prev) => [...prev, data]);
      setRefreshCalendar(r => r + 1);
      setShowModal(false);
      setForm(emptyForm(selectedDate));
      
      if (reminder_at && hasPermission) {
        scheduleLocalReminder(data.id, data.title, data.description || 'Upcoming task reminder', reminder_at);
      }
      
      showToast(reminder_at ? (hasPermission ? 'Task added with reminder 🔔' : 'Task added, but notifications blocked') : 'Task added!');
    } else if (error) {
      showToast(error.message, 'error');
    }
  }

  function openModal() {
    setForm(emptyForm(selectedDate));
    setShowModal(true);
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'pending') return !t.is_completed;
    if (filter === 'completed') return t.is_completed;
    return true;
  });
  const checklist = filtered.filter((t) => t.is_daily_checklist);
  const regular = filtered.filter((t) => !t.is_daily_checklist);

  const dateLabel =
    selectedDate === today
      ? 'Today'
      : selectedDate === (() => { const d = new Date(today); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()
      ? 'Yesterday'
      : new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  function TaskItem({ task }) {
    return (
      <li className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
        <button
          onClick={() => toggleComplete(task)}
          className={`mt-0.5 w-4.5 h-4.5 rounded border-2 shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
            task.is_completed ? 'bg-[#10B981] border-[#10B981]' : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500'
          }`}
        >
          {task.is_completed && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${task.is_completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
              style={{ 
                background: task.task_type === 'revision' ? '#A855F720' : (task.task_type === 'target' ? '#3B82F620' : PRIORITY_COLOR[task.priority] + '18'), 
                color: task.task_type === 'revision' ? '#A855F7' : (task.task_type === 'target' ? '#3B82F6' : PRIORITY_COLOR[task.priority]) 
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.task_type === 'revision' ? '#A855F7' : (task.task_type === 'target' ? '#3B82F6' : PRIORITY_COLOR[task.priority]) }} />
              {task.task_type || task.priority}
            </span>
            {task.category && (
              <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{task.category}</span>
            )}
            {task.is_external && (
              <span className="text-[10px] text-gray-400 font-medium italic">(Sync from Tracker)</span>
            )}
          </div>
        </div>
        {!task.is_external && (
          <button
            onClick={() => deleteTask(task.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500 hover:text-red-500 cursor-pointer shrink-0"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </li>

    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tasks</h1>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Calendar Widget */}
      <CalendarView
        userId={user?.id}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        supabase={supabase}
        refreshTrigger={refreshCalendar}
      />

      {/* Date navigator */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
        <button onClick={() => shiftDate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white cursor-pointer transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="flex-1 text-center font-semibold text-gray-900 dark:text-white border-none outline-none bg-transparent cursor-pointer"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{dateLabel}</span>
        <button onClick={() => shiftDate(1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white cursor-pointer transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
        {selectedDate !== today && (
          <button onClick={() => setSelectedDate(today)} className="text-xs text-[#10B981] font-medium hover:underline cursor-pointer">
            Today
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        {['all', 'pending', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize cursor-pointer ${
              filter === f ? 'bg-[#10B981] text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 self-center">
          {tasks.filter((t) => t.is_completed).length}/{tasks.length} done
        </span>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-10 h-10 text-[#E5E7EB] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No tasks for this day</p>
          <button onClick={openModal} className="mt-3 text-xs text-[#10B981] font-medium hover:underline cursor-pointer">
            + Add your first task
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {checklist.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Daily Checklist</span>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {checklist.map((t) => <TaskItem key={t.id} task={t} />)}
              </ul>
            </>
          )}
          {regular.length > 0 && (
            <>
              {checklist.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 border-t border-t-[#E5E7EB]">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tasks</span>
                </div>
              )}
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {regular.map((t) => <TaskItem key={t.id} task={t} />)}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Add task modal */}
      {showModal && (
        <Modal title="New Task" onClose={() => setShowModal(false)} onSubmit={addTask} submitLabel="Add Task" loading={saving}>
          <Input
            label="Title *"
            type="text"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <Input
            label="Description"
            type="text"
            placeholder="Optional notes"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <Input
              label="Time"
              type="time"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </Select>
            <Select label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </Select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_daily_checklist}
              onChange={(e) => setForm((f) => ({ ...f, is_daily_checklist: e.target.checked }))}
              className="w-4 h-4 accent-[#10B981]"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Add to daily checklist</span>
          </label>

          {/* Reminder */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.reminder_enabled}
                onChange={(e) => setForm((f) => ({ ...f, reminder_enabled: e.target.checked, reminder_time: e.target.checked ? f.reminder_time : '' }))}
                className="w-4 h-4 accent-[#10B981]"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Set reminder 🔔</span>
            </label>
            {form.reminder_enabled && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reminder time</label>
                <input
                  type="time"
                  value={form.reminder_time}
                  onChange={(e) => setForm((f) => ({ ...f, reminder_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Notification will fire on {form.date || 'the task date'} at the selected time.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
