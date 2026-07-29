import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  Sparkles,
  Send,
  Trash2,
  AlertCircle,
  Brain,
  Activity,
  User,
  RefreshCw,
  Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';



export default function AiManager() {
  const { user, preferences } = useAuth();
  const location = useLocation();

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am your StudySync AI Day Coach. I have loaded your daily planner tasks, study tracks, and finances. Ask me to plan your schedule, advise on GATE revision, or structure a placement roadmap!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  
  // Sidebar stats
  const [stats, setStats] = useState({
    tasksPending: 0,
    dsaSolved: 0,
    gatePct: 0,
    financeBalance: 0
  });

  const chatEndRef = useRef(null);

  // Fetch current context data for the system prompt
  const fetchContextData = useCallback(async () => {
    if (!user) return;
    try {
      const [tasksRes, dsaRes, gateProgressRes, gateTotalRes, financeRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('is_completed', false),
        supabase.from('dsa_problems').select('id').eq('user_id', user.id).eq('is_solved', true),
        supabase.from('user_syllabus_progress').select('id').eq('user_id', user.id).eq('is_completed', true),
        supabase.from('gate_subtopics').select('id', { count: 'exact' }),
        supabase.from('finance_entries').select('amount, type').eq('user_id', user.id)
      ]);

      const pendingTasks = tasksRes.data || [];
      const dsaSolvedCount = dsaRes.data?.length || 0;
      const gateCompletedCount = gateProgressRes.data?.length || 0;
      const gateTotalCount = gateTotalRes.count || 1;
      const gatePercentage = Math.round((gateCompletedCount / gateTotalCount) * 100);

      // Compute net balance
      const finances = financeRes.data || [];
      const income = finances.filter(f => f.type === 'income').reduce((sum, f) => sum + Number(f.amount), 0);
      const expenses = finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + Number(f.amount), 0);
      const netBalance = income - expenses;

      setStats({
        tasksPending: pendingTasks.length,
        dsaSolved: dsaSolvedCount,
        gatePct: gatePercentage,
        financeBalance: netBalance
      });

      // Format markdown context for prompt injection
      const activeModules = preferences?.active_modules || ['planner', 'ai-manager'];
      
      let contextStr = `User Configuration:\n`;
      contextStr += `- Active Modules: ${activeModules.join(', ')}\n\n`;
      contextStr += `Uncompleted Tasks:\n`;
      if (pendingTasks.length > 0) {
        pendingTasks.forEach(t => {
          contextStr += `  * [${t.priority}] "${t.title}" (Category: ${t.category || 'general'})\n`;
        });
      } else {
        contextStr += `  * No pending tasks in planner.\n`;
      }

      contextStr += `\nStudy Tracks Progress:\n`;
      contextStr += `- DSA Solved Problems: ${dsaSolvedCount}\n`;
      contextStr += `- GATE Syllabus Progress: ${gateCompletedCount} / ${gateTotalCount} subtopics completed (${gatePercentage}%)\n`;
      
      contextStr += `\nFinance status:\n`;
      contextStr += `- Net monthly balance: ₹${netBalance.toLocaleString()} (Total Income: ₹${income.toLocaleString()}, Total Expense: ₹${expenses.toLocaleString()})\n`;

      setContext(contextStr);
    } catch (err) {
      console.error('Failed to compile prompt context:', err);
    }
  }, [user, preferences]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContextData();
  }, [fetchContextData]);

  // Auto Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);



  // Trigger Send
  const handleSend = async (customText) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    if (!customText) setInput('');
    setLoading(true);

    // 1. Try Vercel Serverless Function Proxy
    try {
      // Gemini API requires the first message to have the role 'user'.
      // We filter out the initial welcome assistant message from the history.
      const historyToSend = messages.length > 0 && messages[0].content.includes('Hello! I am your StudySync')
        ? messages.slice(1)
        : messages;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...historyToSend, userMessage],
          context: context
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
          setLoading(false);
          return;
        } else {
          console.error('Gemini returned an empty reply. Full response:', data);
          throw new Error('Gemini API returned an empty reply. See console for details.');
        }
      } else {
        const errText = await response.text();
        console.error('Server returned an error:', response.status, errText);
        setMessages(prev => [...prev, { role: 'assistant', content: `🚨 **Connection Error**: ${response.status} - ${errText}` }]);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Vercel API proxy fetch error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: `🚨 **Network Error**: Could not reach the API proxy. Are you running the dev server correctly?` }]);
      setLoading(false);
      return;
    }

    // 2. Try Supabase Edge Function Proxy as fallback (Disabled since Vercel is preferred now)
    // 3. Channel C: Simulator Heuristics Fallback (Disabled to prevent confusion)
    // We now just return errors clearly to the user instead of mocking.
  };

  // Trigger autoprompts from other pages (e.g. Placement Prep roadmaps)
  useEffect(() => {
    if (location.state?.autoPrompt && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleSend(location.state.autoPrompt);
      // Clear history state to avoid loops on refresh
      window.history.replaceState({}, document.title);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.autoPrompt, context]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat cleared. What can I help you plan or study next?"
      }
    ]);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10rem)] max-h-[700px] overflow-hidden">
      
      {/* ── Left Sidebar (280px) ── */}
      <aside className="w-full lg:w-[280px] flex flex-col gap-4 overflow-y-auto shrink-0 select-none">
        
        {/* Today at a Glance Stats */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Live Workspace Stats</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Pending Tasks</span>
              <span className="text-xs font-black text-gray-900 dark:text-white">{stats.tasksPending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase">DSA Problems Solved</span>
              <span className="text-xs font-black text-orange-500">{stats.dsaSolved}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase">GATE Syllabus Done</span>
              <span className="text-xs font-black text-blue-500">{stats.gatePct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Finances (Balance)</span>
              <span className={`text-xs font-black ${stats.financeBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                ₹{stats.financeBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>


        <button
          onClick={clearChat}
          className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-red-500 text-gray-400 hover:text-red-500 text-xs font-black uppercase tracking-wider rounded-2xl cursor-pointer transition-all"
        >
          <Trash2 className="w-4 h-4" /> Clear Conversation
        </button>

      </aside>

      {/* ── Right Panel: Chat Interface ── */}
      <section className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem] shadow-sm flex flex-col overflow-hidden">
        
        {/* Messages list */}
        <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-4">
          {messages.map((m, idx) => {
            const isAI = m.role === 'assistant';
            return (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${
                  isAI ? 'mr-auto items-start' : 'ml-auto flex-row-reverse items-end'
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  isAI ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20' : 'bg-purple-100 text-purple-600 dark:bg-purple-950/20'
                }`}>
                  {isAI ? <Brain className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
                </div>

                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                  isAI
                    ? 'bg-gray-50 dark:bg-gray-900/40 text-gray-800 dark:text-gray-100 border-gray-100 dark:border-gray-750'
                    : 'bg-[#10B981] text-white border-[#10B981]'
                }`}>
                  {/* Handle AI messages headers / lists */}
                  {isAI ? (
                    <div className="prose dark:prose-invert prose-xs max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="font-bold whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            );
          })}
          
          {loading && (
            <div className="flex gap-3 mr-auto items-center animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl px-4 py-2 text-xs font-bold bg-gray-50 text-gray-400 border border-gray-100">
                Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-gray-150 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div className="flex gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all items-end">
            <textarea
              rows="1"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="flex-1 px-3 py-2 text-xs font-bold outline-none border-none bg-transparent resize-none dark:text-white placeholder-gray-300 max-h-[150px] overflow-y-auto"
              style={{ minHeight: '36px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl transition-all disabled:opacity-60 cursor-pointer self-end shadow-md shadow-emerald-500/10"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </section>

    </div>
  );
}
