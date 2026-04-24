import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { SkeletonRow } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Groceries', 'Books', 'Utilities', 'Other'];
const INCOME_CATEGORIES = ['Internship/Stipend', 'Milk money', 'Pocket money from parents', 'Other'];

const CAT_COLOR = {
  Food: '#EF4444', Transport: '#F59E0B', Entertainment: '#8B5CF6',
  Groceries: '#10B981', Books: '#3B82F6', Utilities: '#6366F1', Other: '#6B7280',
  'Internship/Stipend': '#10B981', 'Milk money': '#3B82F6', 'Pocket money from parents': '#8B5CF6'
};

function Modal({ title, onClose, onSubmit, children, submitLabel = 'Save', loading = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
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
      <input {...props} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors placeholder-[#9CA3AF]" />
    </div>
  );
}

function FieldSelect({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <select {...props} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-colors bg-white dark:bg-gray-800">
        {children}
      </select>
    </div>
  );
}

function monthLabel(month) {
  const [y, m] = month.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Finance() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const today = localToday();
  const cm = currentMonth();

  // Set page title
  useEffect(() => {
    document.title = 'Finance | StudySync';
    return () => { document.title = 'StudySync'; };
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(cm);
  const [entries, setEntries] = useState([]);
  const [budget, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('All');

  const [form, setForm] = useState({ type: 'expense', category: 'Food', customCategory: '', amount: '', description: '', date: today, payment_method: 'UPI' });
  const [budgetForm, setBudgetForm] = useState({ total_budget: '', categories: {} });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    const [y, m] = selectedMonth.split('-');
    const lastDayOfMonth = new Date(y, m, 0).getDate();
    
    const start = selectedMonth + '-01';
    const end = `${selectedMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;
    
    const [entriesRes, budgetRes] = await Promise.all([
      supabase.from('finance_entries').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('finance_budget').select('*').eq('user_id', user.id).eq('month', selectedMonth + '-01').maybeSingle(),
    ]);
    setEntries(entriesRes.data || []);
    setBudgetData(budgetRes.data || null);
    setLoading(false);
  }, [user, selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function addEntry() {
    if (!form.amount || isNaN(Number(form.amount))) return;
    setSaving(true);
    
    const finalCategory = form.category === 'Other' && form.customCategory?.trim() ? form.customCategory.trim() : form.category;
    const { customCategory, ...payload } = form;
    payload.category = finalCategory;

    const { data, error } = await supabase
      .from('finance_entries')
      .insert({ ...payload, user_id: user.id, amount: Number(payload.amount) })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setEntries((prev) => [data, ...prev]);
      setShowAddModal(false);
      setForm({ type: 'expense', category: 'Food', customCategory: '', amount: '', description: '', date: today, payment_method: 'UPI' });
      showToast('Transaction added!');
    } else if (error) {
      showToast(error.message, 'error');
    }
  }

  async function saveBudget() {
    if (!budgetForm.total_budget) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      month: selectedMonth + '-01',
      total_budget: Number(budgetForm.total_budget),
      categories: budgetForm.categories,
    };
    const { data, error } = await supabase
      .from('finance_budget')
      .upsert(payload, { onConflict: 'user_id,month' })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setBudgetData(data);
      setShowBudgetModal(false);
      showToast('Budget saved!');
    } else if (error) {
      showToast(error.message, 'error');
    }
  }

  async function deleteEntry(id) {
    await supabase.from('finance_entries').delete().eq('id', id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    showToast('Entry deleted');
  }

  function exportToCSV() {
    if (entries.length === 0) return;
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method'];
    const rows = entries.map(e => [e.date, e.type, e.category, e.description || '', e.amount, e.payment_method || 'UPI']);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudySync_Finance_${selectedMonth}.csv`;
    a.click();
    showToast('Exporting CSV...');
  }

  // Computed
  const expenses = entries.filter((e) => e.type === 'expense');
  const income = entries.filter((e) => e.type === 'income');
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalIncome = income.reduce((s, e) => s + Number(e.amount), 0);
  const totalBudget = budget?.total_budget || 0;
  const budgetPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const remaining = totalBudget - totalSpent;

  const dayCount = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).getDate();
  const currentDay = selectedMonth === cm ? new Date().getDate() : dayCount;
  const dailyAvg = totalSpent / currentDay;
  const projected = dailyAvg * dayCount;

  // Per-category spend
  const catSpend = {};
  expenses.forEach((e) => {
    catSpend[e.category] = (catSpend[e.category] || 0) + Number(e.amount);
  });
  const allExpenseCats = Object.keys(catSpend);
  const UNIQUE_EXPENSE_CATS = Array.from(new Set([...EXPENSE_CATEGORIES, ...allExpenseCats]));

  function openBudgetModal() {
    setBudgetForm({
      total_budget: budget?.total_budget?.toString() || '',
      categories: budget?.categories || Object.fromEntries(UNIQUE_EXPENSE_CATS.map((c) => [c, ''])),
    });
    setShowBudgetModal(true);
  }

  const filteredEntries = entries.filter(e => {
    const matchSearch = !searchTerm || (e.description || e.category).toLowerCase().includes(searchTerm.toLowerCase());
    const matchMethod = filterMethod === 'All' || e.payment_method === filterMethod;
    return matchSearch && matchMethod;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance</h1>
          <button
            onClick={exportToCSV}
            className="p-2 text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer"
            title="Export CSV"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={openBudgetModal}
            className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
          >
            {budget ? 'Edit Budget' : 'Set Budget'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add
          </button>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
        <button onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white cursor-pointer">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="flex-1 text-center font-semibold text-gray-900 dark:text-white">{monthLabel(selectedMonth)}</span>
        <button onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white cursor-pointer">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
        {selectedMonth !== cm && (
          <button onClick={() => setSelectedMonth(cm)} className="text-xs text-[#10B981] font-medium hover:underline cursor-pointer">
            This month
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-4 text-center">
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">Income</p>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">₹{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/50 rounded-xl p-4 text-center">
          <p className="text-[10px] text-red-500 dark:text-red-400 font-bold uppercase tracking-widest">Spent</p>
          <p className="text-lg font-black text-red-600 dark:text-red-300 mt-1">₹{totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-xl p-4 text-center">
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest">Daily Avg</p>
          <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-1">₹{Math.round(dailyAvg).toLocaleString()}</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${remaining >= 0 ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${remaining >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>Remaining</p>
          <p className={`text-lg font-black mt-1 ${remaining >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-600 dark:text-red-300'}`}>
            {remaining >= 0 ? '₹' : '-₹'}{Math.abs(remaining).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">

      {/* Budget progress */}
      {totalBudget > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Budget Used</span>
            <span className={`text-sm font-semibold ${budgetPct > 90 ? 'text-red-500' : budgetPct > 70 ? 'text-amber-500' : 'text-emerald-600'}`}>
              {budgetPct}% — ₹{totalSpent.toLocaleString()} of ₹{totalBudget.toLocaleString()}
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${budgetPct}%`, background: budgetPct > 90 ? '#EF4444' : budgetPct > 70 ? '#F59E0B' : '#10B981' }}
            />
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {expenses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Category Breakdown</h2>
          <div className="space-y-3">
            {allExpenseCats.filter((c) => catSpend[c] > 0).sort((a, b) => catSpend[b] - catSpend[a]).map((cat) => {
              const pct = totalSpent > 0 ? Math.round((catSpend[cat] / totalSpent) * 100) : 0;
              const budgetCat = budget?.categories?.[cat];
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLOR[cat] }} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">₹{catSpend[cat].toLocaleString()}</span>
                      {budgetCat && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">/ ₹{Number(budgetCat).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: CAT_COLOR[cat] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* Projected Spend */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Projection</h3>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-black text-gray-900 dark:text-white">₹{Math.round(projected).toLocaleString()}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Estimated Month End</p>
              </div>
              <div className={`text-xs font-bold px-2 py-1 rounded-lg ${projected > totalBudget ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {projected > totalBudget ? 'Over Budget' : 'Safe'}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 leading-relaxed">
                Based on your current average of <span className="font-bold text-gray-900 dark:text-white">₹{Math.round(dailyAvg)}/day</span>, you are on track to spend <span className="font-bold text-gray-900 dark:text-white">₹{Math.round(projected)}</span> this month.
              </p>
            </div>
          </div>

          {/* Budget progress summary for sidebar if budget exists */}
          {totalBudget > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Budget Status</h3>
              <div className="flex justify-between items-center mb-2">
                <span className={`text-lg font-black ${budgetPct > 90 ? 'text-red-500' : budgetPct > 70 ? 'text-amber-500' : 'text-emerald-600'}`}>
                  {budgetPct}%
                </span>
                <span className="text-[10px] text-gray-400 font-bold">USED</span>
              </div>
              <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${budgetPct}%`, background: budgetPct > 90 ? '#EF4444' : budgetPct > 70 ? '#F59E0B' : '#10B981' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-3">₹{totalSpent.toLocaleString()} of ₹{totalBudget.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Transactions list */}
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Transactions</h2>
        {loading ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
            {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center py-12 text-center">
            <svg className="w-10 h-10 text-[#E5E7EB] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No transactions this month</p>
            <button onClick={() => setShowAddModal(true)} className="mt-3 text-xs text-[#10B981] font-medium hover:underline cursor-pointer">
              + Add first transaction
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
        <div className="p-2 divide-y divide-gray-50 dark:divide-gray-800">
          {filteredEntries.map((e) => (
            <div key={e.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-black shadow-sm"
                style={{ background: CAT_COLOR[e.category] || '#6B7280' }}
              >
                {e.category?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{e.description || e.category}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{e.category}</span>
                  <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border border-gray-200 dark:border-gray-700">
                    {e.payment_method || 'UPI'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">{e.date}</span>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <span className={`text-sm font-black shrink-0 ${e.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {e.type === 'income' ? '+' : '-'}₹{Number(e.amount).toLocaleString()}
                </span>
                <button
                  onClick={() => deleteEntry(e.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {filteredEntries.length === 0 && searchTerm && (
            <div className="py-12 text-center text-gray-400 italic text-xs">
              No transactions matching "{searchTerm}"
            </div>
          )}
        </div>
      </div>

      {/* Add transaction modal */}
      {showAddModal && (
        <Modal title="Add Transaction" onClose={() => setShowAddModal(false)} onSubmit={addEntry} submitLabel="Add" loading={saving}>
          <div className="flex gap-2">
            {['expense', 'income'].map((t) => (
              <button
                key={t}
                onClick={() => setForm((f) => ({ ...f, type: t, category: t === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0] }))}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer capitalize ${
                  form.type === t
                    ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {t === 'expense' ? '− Expense' : '+ Income'}
              </button>
            ))}
          </div>
          <FieldInput
            label="Amount (₹) *"
            type="number"
            min="0"
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            autoFocus
          />
          <FieldSelect label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {(form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
          </FieldSelect>
          <FieldSelect label="Payment Method" value={form.payment_method} onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}>
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank Transfer</option>
            <option value="Card">Card</option>
          </FieldSelect>
          {form.category === 'Other' && (
            <FieldInput
              label="Custom Category Name *"
              type="text"
              placeholder="e.g. Gift, Bonus, Software"
              value={form.customCategory || ''}
              onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
            />
          )}
          <FieldInput
            label="Description"
            type="text"
            placeholder="What was this for?"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <FieldInput
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </Modal>
      )}

      {/* Budget modal */}
      {showBudgetModal && (
        <Modal title="Set Monthly Budget" onClose={() => setShowBudgetModal(false)} onSubmit={saveBudget} submitLabel="Save Budget" loading={saving}>
          <FieldInput
            label={`Total Budget for ${monthLabel(selectedMonth)} (₹) *`}
            type="number"
            min="0"
            placeholder="e.g. 10000"
            value={budgetForm.total_budget}
            onChange={(e) => setBudgetForm((f) => ({ ...f, total_budget: e.target.value }))}
            autoFocus
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">Optionally set per-category limits:</p>
          {UNIQUE_EXPENSE_CATS.map((cat) => (
            <FieldInput
              key={cat}
              label={cat}
              type="number"
              min="0"
              placeholder="No limit"
              value={budgetForm.categories[cat] || ''}
              onChange={(e) =>
                setBudgetForm((f) => ({
                  ...f,
                  categories: { ...f.categories, [cat]: e.target.value },
                }))
              }
            />
          ))}
        </Modal>
      )}
    </div>
  );
}
