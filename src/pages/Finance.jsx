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

  useEffect(() => { fetchData(); }, [fetchData]); // eslint-disable-line react-hooks/set-state-in-effect

  async function addEntry() {
    if (!form.amount || isNaN(Number(form.amount))) return;
    setSaving(true);
    
    const finalCategory = form.category === 'Other' && form.customCategory?.trim() ? form.customCategory.trim() : form.category;
    const { customCategory: _, ...payload } = form;
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
  });  return (
    <div className="space-y-8 pb-24">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Finance Hub</h1>
          <div className="flex items-center gap-2">
            <span className="w-8 h-1 bg-emerald-500 rounded-full" />
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Management & Projections</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportToCSV}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-emerald-500 transition-all cursor-pointer shadow-sm hover:shadow-emerald-500/10"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            onClick={openBudgetModal}
            className="px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all cursor-pointer shadow-sm"
          >
            {budget ? 'Modify Budget' : 'Configure Budget'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="group flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-500/20 cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Record
          </button>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Month Navigator Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))} className="p-3 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <div className="text-center">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">{monthLabel(selectedMonth).split(' ')[1]}</p>
              <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{monthLabel(selectedMonth).split(' ')[0]}</p>
            </div>
            <button onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))} className="p-3 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase">Records</span>
              <span className="text-sm font-black text-gray-900 dark:text-white">{entries.length}</span>
            </div>
            <div className="h-1 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(100, (entries.length / 50) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Global Key Metrics */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: totalIncome, color: 'emerald', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Total Spending', value: totalSpent, color: 'red', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
            { label: 'Daily Average', value: Math.round(dailyAvg), color: 'amber', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: remaining >= 0 ? 'Surplus' : 'Deficit', value: Math.abs(remaining), color: remaining >= 0 ? 'blue' : 'rose', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all group">
              <div className={`w-10 h-10 rounded-2xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-500`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} /></svg>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-2xl font-black mt-1 tracking-tight text-${stat.color}-600 dark:text-${stat.color}-400`}>₹{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Detailed Expense Analysis */}
          {expenses.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[3rem] p-10 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32" />
              <div className="relative">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-10">Spending Distribution</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {allExpenseCats.filter((c) => catSpend[c] > 0).sort((a, b) => catSpend[b] - catSpend[a]).map((cat) => {
                    const pct = totalSpent > 0 ? Math.round((catSpend[cat] / totalSpent) * 100) : 0;
                    const budgetCat = budget?.categories?.[cat];
                    return (
                      <div key={cat} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3.5 h-3.5 rounded-full shadow-lg" style={{ background: CAT_COLOR[cat] }} />
                            <span className="text-sm font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight">{cat}</span>
                          </div>
                          <span className="text-sm font-black text-gray-900 dark:text-white">₹{catSpend[cat].toLocaleString()}</span>
                        </div>
                        <div className="h-2.5 bg-gray-50 dark:bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-100 dark:border-gray-800">
                          <div
                            className="h-full rounded-full transition-all duration-1000 shadow-sm"
                            style={{ width: `${pct}%`, background: CAT_COLOR[cat] }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-gray-400 uppercase">{pct}% of total</span>
                          {budgetCat && (
                            <span className={`text-[9px] font-black uppercase ${catSpend[cat] > Number(budgetCat) ? 'text-red-500' : 'text-emerald-500'}`}>
                              Limit: ₹{Number(budgetCat).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Transactions Ledger */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[3rem] shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Transactions Ledger</h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-emerald-500/10 dark:text-white transition-all placeholder-gray-300"
                  />
                  <svg className="w-4 h-4 text-gray-300 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <select 
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-emerald-500/10 dark:text-white cursor-pointer"
                >
                  <option value="All">All Methods</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="Cash">Cash Only</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Card">Card / POS</option>
                </select>
              </div>
            </div>
            
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                [1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)
              ) : filteredEntries.length === 0 ? (
                <div className="py-24 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-gray-200 dark:text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No transaction data available</p>
                </div>
              ) : (
                filteredEntries.map((e) => (
                  <div key={e.id} className="px-10 py-6 flex items-center gap-6 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5 transition-all group">
                    <div
                      className="w-14 h-14 rounded-3xl flex items-center justify-center shrink-0 text-white text-lg font-black shadow-xl transition-transform group-hover:scale-105"
                      style={{ background: CAT_COLOR[e.category] || '#6B7280' }}
                    >
                      {e.category?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black text-gray-900 dark:text-white truncate tracking-tight">{e.description || e.category}</p>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{e.category}</span>
                        <div className="w-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border border-gray-200 dark:border-gray-700">
                          {e.payment_method || 'UPI'}
                        </span>
                        <div className="w-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{e.date}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-8">
                      <span className={`text-lg font-black shrink-0 tracking-tighter ${e.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {e.type === 'income' ? '+' : '-'}₹{Number(e.amount).toLocaleString()}
                      </span>
                      <button
                        onClick={() => deleteEntry(e.id)}
                        className="opacity-0 group-hover:opacity-100 transition-all p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Intelligence & Status Sidebar */}
        <div className="space-y-8">
          {/* Predictive Analysis Card */}
          <div className="bg-[#111827] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:bg-emerald-500/40 transition-all duration-1000" />
            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-10">Smart Forecast</h3>
            <div className="space-y-2">
              <p className="text-5xl font-black tracking-tighter">₹{Math.round(projected).toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Expected Expenditure</p>
            </div>
            <div className="mt-12 pt-10 border-t border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Velocity</span>
                <span className="text-xs font-black text-emerald-400">₹{Math.round(dailyAvg)}/day</span>
              </div>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${projected > totalBudget ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-lg ${projected > totalBudget ? 'bg-red-500 shadow-red-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`} />
                {projected > totalBudget ? 'Deficit Risk High' : 'Target Achievable'}
              </div>
            </div>
          </div>

          {/* Core Budget Progress */}
          {totalBudget > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[3rem] p-10 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Budget Status</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${budgetPct > 90 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  {budgetPct}%
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="relative w-full h-4 bg-gray-50 dark:bg-gray-900 rounded-full overflow-hidden p-1 border border-gray-100 dark:border-gray-800">
                  <div
                    className="h-full rounded-full transition-all duration-1000 shadow-lg"
                    style={{ 
                      width: `${budgetPct}%`, 
                      background: budgetPct > 90 ? 'linear-gradient(90deg, #EF4444, #F87171)' : budgetPct > 70 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' : 'linear-gradient(90deg, #10B981, #34D399)' 
                    }}
                  />
                </div>
                <div className="w-full flex justify-between mt-6">
                  <div className="text-left">
                    <p className="text-xl font-black text-gray-900 dark:text-white">₹{totalSpent.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase mt-1">Consumed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-400">₹{totalBudget.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase mt-1">Maximum</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Entry Overlay */}
      {showAddModal && (
        <Modal title="New Transaction" onClose={() => setShowAddModal(false)} onSubmit={addEntry} submitLabel="Finalize Entry" loading={saving}>
          <div className="flex gap-3 mb-6">
            {['expense', 'income'].map((t) => (
              <button
                key={t}
                onClick={() => setForm((f) => ({ ...f, type: t, category: t === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0] }))}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-[1.25rem] transition-all cursor-pointer border ${
                  form.type === t
                    ? t === 'expense' ? 'bg-red-500 border-red-500 text-white shadow-xl shadow-red-500/30' : 'bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/30'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="space-y-5">
            <FieldInput
              label="Transaction Value (₹)"
              type="number"
              min="0"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-5">
              <FieldSelect label="Main Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {(form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
              </FieldSelect>
              <FieldSelect label="Source / Method" value={form.payment_method} onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}>
                <option value="UPI">UPI Digital</option>
                <option value="Cash">Physical Cash</option>
                <option value="Bank">Direct Bank</option>
                <option value="Card">Credit/Debit Card</option>
              </FieldSelect>
            </div>
            {form.category === 'Other' && (
              <FieldInput
                label="Custom Label"
                type="text"
                placeholder="Name this category..."
                value={form.customCategory || ''}
                onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
              />
            )}
            <FieldInput
              label="Memo / Note"
              type="text"
              placeholder="What was this for?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <FieldInput
              label="Execution Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
        </Modal>
      )}

      {/* Budget Orchestration Overlay */}
      {showBudgetModal && (
        <Modal title="Budget Planning" onClose={() => setShowBudgetModal(false)} onSubmit={saveBudget} submitLabel="Commit Strategy" loading={saving}>
          <FieldInput
            label={`Maximum Limit for ${monthLabel(selectedMonth)}`}
            type="number"
            min="0"
            placeholder="0.00"
            value={budgetForm.total_budget}
            onChange={(e) => setBudgetForm((f) => ({ ...f, total_budget: e.target.value }))}
            autoFocus
          />
          <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Categorical Guardrails</h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {UNIQUE_EXPENSE_CATS.map((cat) => (
                <FieldInput
                  key={cat}
                  label={cat}
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  value={budgetForm.categories[cat] || ''}
                  onChange={(e) =>
                    setBudgetForm((f) => ({
                      ...f,
                      categories: { ...f.categories, [cat]: e.target.value },
                    }))
                  }
                />
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
