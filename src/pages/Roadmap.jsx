import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { 
  Map, 
  Plus, 
  Calendar, 
  Book, 
  Briefcase, 
  User, 
  Trophy,
  X,
  Trash2
} from 'lucide-react';
import { SkeletonCard } from '../components/ui/Skeleton';

const CATEGORIES = [
  { id: 'academic', label: 'Academic', Icon: Book, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  { id: 'career', label: 'Career', Icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
  { id: 'achievement', label: 'Achievement', Icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  { id: 'personal', label: 'Personal', Icon: User, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800' }
];

export default function Roadmap() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    category: 'achievement'
  });

  const loadEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roadmap_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: false });
        
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.event_date) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('roadmap_events').insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        event_date: formData.event_date,
        category: formData.category,
        icon: formData.category
      });

      if (error) throw error;
      
      showToast('Milestone added successfully!');
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        event_date: new Date().toISOString().split('T')[0],
        category: 'achievement'
      });
      loadEvents();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this milestone?')) return;
    try {
      const { error } = await supabase.from('roadmap_events').delete().eq('id', id);
      if (error) throw error;
      showToast('Milestone deleted');
      setEvents(events.filter(e => e.id !== id));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Group events by year
  const groupedEvents = events.reduce((acc, event) => {
    const year = new Date(event.event_date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {});

  const sortedYears = Object.keys(groupedEvents).sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <Map className="w-8 h-8 text-cyan-500" /> Life Roadmap
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
            Track your journey, achievements, and milestones over the years.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg"
        >
          <Plus className="w-4 h-4" /> Add Milestone
        </button>
      </div>

      {/* Timeline */}
      {events.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
          <Map className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">No Milestones Yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Your roadmap is currently empty. Start documenting your life's journey by adding your first milestone!
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline"
          >
            Add your first milestone &rarr;
          </button>
        </div>
      ) : (
        <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-4 md:ml-6 space-y-12 pb-8">
          {sortedYears.map((year) => (
            <div key={year} className="relative">
              {/* Year Marker */}
              <div className="flex items-center mb-6 -ml-[1.4rem]">
                <div className="bg-white dark:bg-gray-900 border-2 border-cyan-500 text-cyan-500 px-4 py-1.5 rounded-full font-black text-sm shadow-sm z-10">
                  {year}
                </div>
              </div>

              <div className="space-y-6">
                {groupedEvents[year].map((event) => {
                  const cat = CATEGORIES.find(c => c.id === event.category) || CATEGORIES[2];
                  const Icon = cat.Icon;
                  const dateObj = new Date(event.event_date);
                  const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                  const isFuture = dateObj > new Date();

                  return (
                    <div key={event.id} className="relative pl-8 md:pl-10 group">
                      {/* Timeline Dot */}
                      <div className={`absolute left-[-5px] top-4 w-3 h-3 rounded-full border-2 ${isFuture ? 'border-gray-300 dark:border-gray-600 border-dashed bg-transparent' : `border-white dark:border-gray-900 ${cat.bg.split(' ')[0]} ring-2 ring-gray-200 dark:ring-gray-700`} group-hover:scale-125 transition-transform z-10`} />
                      
                      {/* Event Card */}
                      <div className={`bg-white dark:bg-gray-800 ${isFuture ? 'border-2 border-dashed border-gray-200 dark:border-gray-700 opacity-80' : `border ${cat.border}`} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group-hover:opacity-100`}>
                        {/* Subtle background gradient */}
                        <div className={`absolute top-0 right-0 w-32 h-32 ${cat.bg} rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none`} />
                        
                        <div className="flex items-start justify-between gap-4 relative z-10">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.bg} ${cat.color} ${isFuture ? 'opacity-50 grayscale' : ''}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                  {monthDay}
                                </span>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${cat.bg} ${cat.color}`}>
                                  {cat.label}
                                </span>
                                {isFuture && (
                                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20">
                                    🎯 Future Goal
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                                {event.title}
                              </h3>
                              {event.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100"
                            title="Delete milestone"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Milestone Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10">
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Map className="w-5 h-5 text-cyan-500" />
                Add Milestone
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Graduated College, Started New Job"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-gray-900 dark:text-white font-medium placeholder:text-gray-400 transition-shadow"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={formData.event_date}
                      onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-gray-900 dark:text-white font-medium transition-shadow"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.Icon;
                      const isSelected = formData.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.id })}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                            isSelected 
                              ? `border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-gray-900 dark:text-white` 
                              : `border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-750`
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isSelected ? cat.color : ''}`} />
                          <span className="font-semibold text-sm">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add some details about this milestone..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-gray-900 dark:text-white font-medium placeholder:text-gray-400 transition-shadow resize-none"
                  />
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  {submitting ? 'Saving...' : 'Save Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
