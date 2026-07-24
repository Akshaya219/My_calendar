import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import {
  Code2,
  BookOpen,
  Wallet,
  Briefcase,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const OPTIONAL_MODULES = [
  {
    id: 'dsa',
    name: 'DSA Practice',
    description: 'Track coding problems, platform stats, streaks, and focus topics.',
    Icon: Code2,
    color: 'from-orange-500/10 to-orange-600/10 border-orange-200 dark:border-orange-900/50 text-orange-600 dark:text-orange-400',
    activeColor: 'ring-orange-500 bg-orange-500/10 border-orange-500'
  },
  {
    id: 'gate',
    name: 'GATE Prep',
    description: 'Manage GATE syllabus, track completion, and review spaced revisions.',
    Icon: BookOpen,
    color: 'from-blue-500/10 to-blue-600/10 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400',
    activeColor: 'ring-blue-500 bg-blue-500/10 border-blue-500'
  },
  {
    id: 'finance',
    name: 'Finances',
    description: 'Log daily expenses, track budgets, and project end-of-month status.',
    Icon: Wallet,
    color: 'from-emerald-500/10 to-emerald-600/10 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    activeColor: 'ring-emerald-500 bg-emerald-500/10 border-emerald-500'
  },
  {
    id: 'placement',
    name: 'Placement Prep',
    description: 'Track target companies, check interview benchmarks, and generate roadmaps.',
    Icon: Briefcase,
    color: 'from-purple-500/10 to-purple-600/10 border-purple-200 dark:border-purple-900/50 text-purple-600 dark:text-purple-400',
    activeColor: 'ring-purple-500 bg-purple-500/10 border-purple-500'
  }
];

export default function Onboarding() {
  const { user, refreshPreferences } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(['dsa', 'gate']); // default select two key prep modules
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Welcome | Onboarding Setup';
  }, []);

  const toggleModule = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    // Always include planner and ai-manager
    const finalModules = ['planner', 'ai-manager', ...selected];

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          active_modules: finalModules,
          theme: localStorage.getItem('theme') || 'light',
          onboarded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      showToast('Workspace tailored successfully! 🎉');
      await refreshPreferences();
      navigate('/app', { replace: true });
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Onboarding save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300 font-sans">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-200 dark:border-gray-700 p-8 md:p-12 shadow-2xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
        
        <div className="relative space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-4">
              <span className="text-white font-black text-xl leading-none">S</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Configure Your Workspace</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto">
              Select the modules you need for your B.Tech routine. You can enable or disable modules anytime in Settings.
            </p>
          </div>

          {/* Locked/Default Modules */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Included Core Modules</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">Daily Tasks & AI Day Coach</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Essential core functions are always enabled for study planning.</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase text-gray-400">
                <Calendar className="w-3.5 h-3.5" /> Planner
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase text-gray-400">
                <Sparkles className="w-3.5 h-3.5" /> AI Coach
              </span>
            </div>
          </div>

          {/* Optional Modules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {OPTIONAL_MODULES.map(({ id, name, description, Icon, color, activeColor }) => {
              const isActive = selected.includes(id);
              return (
                <div
                  key={id}
                  onClick={() => toggleModule(id)}
                  className={`bg-gradient-to-br border rounded-3xl p-5 cursor-pointer select-none transition-all duration-200 flex flex-col justify-between gap-4 hover:-translate-y-0.5 shadow-sm hover:shadow-md ${
                    isActive
                      ? `ring-2 ${activeColor} dark:bg-gray-700/50`
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-2xl bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm border ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    {/* Checkbox circle */}
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isActive ? 'bg-[#10B981] border-[#10B981]' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isActive && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-3xl transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? 'Configuring…' : (
              <>
                Initialize Dashboard <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          
        </div>
      </div>
    </div>
  );
}
