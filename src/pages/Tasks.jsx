import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PRIORITIES = ['low', 'medium', 'high'];
const CATEGORIES = ['placement', 'gate', 'dsa', 'personal', 'finance'];
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="font-semibold text-[#111827]">{title}</h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#E5E7EB]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
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
      {label && <label className="block text-xs font-medium text-[#6B7280] mb-1">{label}</label>}
      <input
        {...props}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors placeholder-[#9CA3AF]"
      />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-[#6B7280] mb-1">{label}</label>}
      <select
        {...props}
        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors bg-white"
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

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', selectedDate)
      .order('is_daily_checklist', { ascending: false })
      .order('time', { ascending: true, nullsFirst: false });
    setTasks(data || []);
    setLoading(false);
  }, [user, selectedDate]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  function shiftDate(days) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }

  async function toggleComplete(task) {
    const { data } = await supabase
      .from('tasks')
      .update({ is_completed: !task.is_completed })
      .eq('id', task.id)
      .select()
      .single();
    if (data) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
      if (!task.is_completed) showToast('Task completed ✓');
    }
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('Task deleted');
  }

  async function addTask() {
    if (!form.title.trim()) return;
    setSaving(true);

    // Build the payload — strip UI-only reminder fields before inserting
    const { reminder_enabled, reminder_time, ...rest } = form;

    // Compute reminder_at: combine task date + reminder_time into ISO timestamp
    let reminder_at = null;
    if (reminder_enabled && reminder_time && rest.date) {
      reminder_at = new Date(`${rest.date}T${reminder_time}:00`).toISOString();
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...rest, user_id: user.id, reminder_at, reminder_sent: false })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      if (data.date === selectedDate) setTasks((prev) => [...prev, data]);
      setShowModal(false);
      setForm(emptyForm(selectedDate));
      showToast(reminder_at ? 'Task added with reminder 🔔' : 'Task added!');
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
      <li className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-[#F9FAFB] transition-colors group">
        <button
          onClick={() => toggleComplete(task)}
          className={`mt-0.5 w-4.5 h-4.5 rounded border-2 shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
            task.is_completed ? 'bg-[#4F46E5] border-[#4F46E5]' : 'border-[#D1D5DB] hover:border-[#4F46E5]'
          }`}
        >
          {task.is_completed && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${task.is_completed ? 'line-through text-[#9CA3AF]' : 'text-[#111827]'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
              style={{ background: PRIORITY_COLOR[task.priority] + '18', color: PRIORITY_COLOR[task.priority] }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLOR[task.priority] }} />
              {task.priority}
            </span>
            {task.category && (
              <span className="text-xs text-[#9CA3AF] capitalize">{task.category}</span>
            )}
            {task.time && (
              <span className="text-xs text-[#9CA3AF]">⏰ {task.time.slice(0, 5)}</span>
            )}
            {task.reminder_at && !task.reminder_sent && (
              <span className="text-xs text-[#4F46E5]" title={`Reminder: ${new Date(task.reminder_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}>
                🔔
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => deleteTask(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#9CA3AF] hover:text-red-500 cursor-pointer shrink-0"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </li>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111827]">Tasks</h1>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3 bg-white border border-[#E5E7EB] rounded-xl px-4 py-3">
        <button onClick={() => shiftDate(-1)} className="text-[#6B7280] hover:text-[#111827] cursor-pointer transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="flex-1 text-center font-semibold text-[#111827] border-none outline-none bg-transparent cursor-pointer"
        />
        <span className="text-sm text-[#6B7280] hidden sm:block">{dateLabel}</span>
        <button onClick={() => shiftDate(1)} className="text-[#6B7280] hover:text-[#111827] cursor-pointer transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
        {selectedDate !== today && (
          <button onClick={() => setSelectedDate(today)} className="text-xs text-[#4F46E5] font-medium hover:underline cursor-pointer">
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
              filter === f ? 'bg-[#4F46E5] text-white' : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#9CA3AF] self-center">
          {tasks.filter((t) => t.is_completed).length}/{tasks.length} done
        </span>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden divide-y divide-[#F3F4F6]">
          {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-10 h-10 text-[#E5E7EB] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm font-medium text-[#6B7280]">No tasks for this day</p>
          <button onClick={openModal} className="mt-3 text-xs text-[#4F46E5] font-medium hover:underline cursor-pointer">
            + Add your first task
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          {checklist.length > 0 && (
            <>
              <div className="px-4 py-2 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Daily Checklist</span>
              </div>
              <ul className="divide-y divide-[#F3F4F6]">
                {checklist.map((t) => <TaskItem key={t.id} task={t} />)}
              </ul>
            </>
          )}
          {regular.length > 0 && (
            <>
              {checklist.length > 0 && (
                <div className="px-4 py-2 bg-[#F9FAFB] border-b border-[#E5E7EB] border-t border-t-[#E5E7EB]">
                  <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Tasks</span>
                </div>
              )}
              <ul className="divide-y divide-[#F3F4F6]">
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
              className="w-4 h-4 accent-[#4F46E5]"
            />
            <span className="text-sm text-[#374151]">Add to daily checklist</span>
          </label>

          {/* Reminder */}
          <div className="border border-[#E5E7EB] rounded-lg p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.reminder_enabled}
                onChange={(e) => setForm((f) => ({ ...f, reminder_enabled: e.target.checked, reminder_time: e.target.checked ? f.reminder_time : '' }))}
                className="w-4 h-4 accent-[#4F46E5]"
              />
              <span className="text-sm text-[#374151]">Set reminder 🔔</span>
            </label>
            {form.reminder_enabled && (
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Reminder time</label>
                <input
                  type="time"
                  value={form.reminder_time}
                  onChange={(e) => setForm((f) => ({ ...f, reminder_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-colors"
                />
                <p className="text-xs text-[#9CA3AF] mt-1">
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
