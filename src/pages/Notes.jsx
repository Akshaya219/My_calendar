import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { Plus, Pin, Trash2, Edit2, FileText, Search } from 'lucide-react';

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
          <button onClick={onSubmit} disabled={loading} className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 cursor-pointer">
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
      <input {...props} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors placeholder-gray-400" />
    </div>
  );
}

function FieldTextarea({ label, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <textarea {...props} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors placeholder-gray-400 min-h-[120px] resize-y" />
    </div>
  );
}

const emptyForm = () => ({ title: '', content: '', is_pinned: false });

export default function Notes() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);

  const fetchNotes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('daily_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Notes | StudySync';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSaveNote = async () => {
    if (!form.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('daily_notes')
          .update({
            title: form.title,
            content: form.content,
            is_pinned: form.is_pinned,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)
          .eq('user_id', user.id);
        if (error) throw error;
        showToast('Note updated successfully!');
      } else {
        const { error } = await supabase
          .from('daily_notes')
          .insert([{
            user_id: user.id,
            title: form.title,
            content: form.content,
            is_pinned: form.is_pinned
          }]);
        if (error) throw error;
        showToast('Note created successfully!');
      }
      setShowModal(false);
      fetchNotes();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      const { error } = await supabase
        .from('daily_notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      showToast('Note deleted');
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const togglePin = async (note) => {
    try {
      const newStatus = !note.is_pinned;
      const { error } = await supabase
        .from('daily_notes')
        .update({ is_pinned: newStatus })
        .eq('id', note.id)
        .eq('user_id', user.id);
      if (error) throw error;
      
      // Optimistic update
      const updatedNotes = notes.map(n => n.id === note.id ? { ...n, is_pinned: newStatus } : n);
      updatedNotes.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setNotes(updatedNotes);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openNewModal = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (note) => {
    setForm({ title: note.title, content: note.content, is_pinned: note.is_pinned });
    setEditingId(note.id);
    setShowModal(true);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    (n.content && n.content.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-pink-500" /> Daily Notes
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Jot down life updates, ideas, and reminders.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full md:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-pink-500"
            />
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium rounded-lg transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2">No Notes Found</h3>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            {search ? "No notes matched your search." : "You haven't written any notes yet. Click 'New Note' to start journaling!"}
          </p>
          {!search && (
            <button onClick={openNewModal} className="px-5 py-2.5 bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-colors cursor-pointer">
              Create First Note
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map(note => (
            <div key={note.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
              
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white pr-8 line-clamp-2">{note.title}</h3>
                <button 
                  onClick={() => togglePin(note)}
                  className={`absolute top-4 right-4 p-1.5 rounded-lg cursor-pointer transition-colors ${note.is_pinned ? 'text-pink-500 bg-pink-50 dark:bg-pink-500/10' : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title={note.is_pinned ? "Unpin" : "Pin"}
                >
                  <Pin className={`w-4 h-4 ${note.is_pinned ? 'fill-current' : ''}`} />
                </button>
              </div>
              
              <div className="flex-1 text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap line-clamp-5">
                {note.content || <span className="text-gray-400 italic">No content...</span>}
              </div>
              
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(note)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(note.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Modal */}
      {showModal && (
        <Modal 
          title={editingId ? "Edit Note" : "New Note"} 
          onClose={() => setShowModal(false)} 
          onSubmit={handleSaveNote} 
          loading={saving}
        >
          <FieldInput
            label="Title *"
            type="text"
            placeholder="e.g. Ideas for Weekend"
            value={form.title}
            onChange={(e) => setForm(f => ({...f, title: e.target.value}))}
            autoFocus
          />
          <FieldTextarea
            label="Note Content"
            placeholder="Write your thoughts here..."
            value={form.content}
            onChange={(e) => setForm(f => ({...f, content: e.target.value}))}
          />
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input 
              type="checkbox" 
              checked={form.is_pinned}
              onChange={(e) => setForm(f => ({...f, is_pinned: e.target.checked}))}
              className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5 text-pink-500" /> Pin this note to top
            </span>
          </label>
        </Modal>
      )}
    </div>
  );
}
