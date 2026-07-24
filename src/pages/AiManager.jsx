import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
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

const SUGGESTIONS = [
  'Plan my day based on my current tasks',
  'What should I focus on first today?',
  'Review my preparation progress',
  'Give me a detailed study schedule',
  'How am am doing financially this month?'
];

export default function AiManager() {
  const { user, preferences } = useAuth();
  const { showToast } = useToast();
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
    fetchContextData();
  }, [fetchContextData]);

  // Auto Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Trigger autoprompts from other pages (e.g. Placement Prep roadmaps)
  useEffect(() => {
    if (location.state?.autoPrompt && context) {
      handleSend(location.state.autoPrompt);
      // Clear history state to avoid loops on refresh
      window.history.replaceState({}, document.title);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.autoPrompt, context]);

  // Handle Simulation AI engine fallback
  const generateSimulatedResponse = (prompt) => {
    const p = prompt.toLowerCase();
    let reply = "";

    if (p.includes('plan my day') || p.includes('schedule') || p.includes('daily plan')) {
      reply = `### 📋 Your Tailored Daily Schedule

Based on your current status, here is an optimized daily plan to help you lock in placements prep alongside your GATE schedules:

*   **08:00 AM - 09:00 AM**: 🚶 Morning routine & Daily Planner checklist check.
*   **09:00 AM - 11:30 AM**: 💻 **DSA Target Practice**: Use the Quick-Add buttons on your DSA page to trigger LeetCode drills. Let's aim to clear 2 Easy and 1 Medium difficulty problems.
*   **02:00 PM - 04:30 PM**: 📚 **GATE Target Subject Focus**: Log in and spend time on Database & Data Warehousing indexing subtopics.
*   **05:00 PM - 06:00 PM**: 🗣️ **Interview Readiness**: Review behavioral checkpoints (STAR Method) on the Placement Prep page.
*   **08:00 PM - 09:00 PM**: ⏰ **Daily Review**: Run through your GATE spaced repetition queue to master overdue revisions.

*Streak warning*: You currently have **${stats.tasksPending}** tasks remaining. Tackle them to keep your streak hot! 🔥`;
    } 
    else if (p.includes('placement') || p.includes('roadmap') || p.includes('company')) {
      reply = `### 🚀 B.Tech AI & DS Placement Strategy

Here is a roadmap based on your active modules:

1.  **DSA Drilling**: You have solved **${stats.dsaSolved}** problems. Optimize this by solving at least 3 problems daily across recursion, graphs, and dynamic programming on platforms like LeetCode.
2.  **CS Fundamentals**: Double-down on Database Management Systems (SQL schemas, Normalization, indexing models) which is tested extensively in AI & DS placements.
3.  **Target Tracker**: Ensure to log upcoming recruitment deadlines on your Placement Prep dashboard.
4.  **Resume Build**: Highlight projects related to Machine Learning algorithms and Database warehouses. Make sure your GitHub repos have high-quality READMEs.`;
    }
    else if (p.includes('gate') || p.includes('syllabus') || p.includes('focus')) {
      reply = `### 📚 GATE DA & CS Study Guide

You have completed **${stats.gatePct}%** of the syllabus subtopics. Here is your study guide:

*   **Focus Priority**: Allocate 70% of your time to Data Structures & Algorithms and Probability & Statistics.
*   **Revision Queue**: Check your revision queue today. You have spaced-repetition slots open. Master these before picking new topics.
*   **Mock Prep**: Aim to log mock test scores on the GATE tab at least once every 2 weeks. Analyse your weak areas (e.g. Probability, CPU scheduling) and log them.`;
    } 
    else if (p.includes('financ') || p.includes('budget') || p.includes('expense')) {
      reply = `### 💰 Monthly Finance Status

Your net monthly ledger stands at **₹${stats.financeBalance.toLocaleString()}**.

*   *Budget Guardrails*: Keep daily spend averages within bounds. Check Settings → Configure Budgets to set specific category limits.
*   *Forecast Tool*: Head over to the Finance dashboard to check your Smart Forecast projection. It calculates end-of-month estimates based on daily average spend velocity.`;
    } 
    else {
      reply = `### 💡 Coach Feedback

I am reviewing your StudySync metrics:
- Pending Tasks: **${stats.tasksPending}**
- DSA Solved: **${stats.dsaSolved}**
- GATE Syllabus: **${stats.gatePct}%**
- Finance Balance: **₹${stats.financeBalance.toLocaleString()}**

To boost your productivity:
1. Complete at least one High-priority planner task now.
2. Log daily coding targets to trigger database sync triggers.
3. Head over to the Settings page to toggle themes or configure alerts.

Let me know if you need specific advice on algorithms, placements, or mock tests!`;
    }

    return reply;
  };

  // Trigger Send
  const handleSend = async (customText) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    if (!customText) setInput('');
    setLoading(true);

    try {
      // 1. Channel A: Try Supabase Edge Function Proxy
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [...messages, userMessage],
          context: context
        }
      });

      if (!error && data?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        setLoading(false);
        return;
      }
      
      // 2. Channel B: Try client key fallback
      const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (key) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            system: `You are the StudySync AI Day Manager. Use the following user statistics and tasks as direct context to plan schedules, answer study queries, or layout interview plans: \n\n${context}`,
            messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          const replyText = resJson.content?.[0]?.text || '';
          setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
          setLoading(false);
          return;
        }
      }

      // 3. Channel C: Simulator Heuristics Fallback
      setTimeout(() => {
        const simReply = generateSimulatedResponse(textToSend);
        setMessages(prev => [...prev, { role: 'assistant', content: simReply }]);
        showToast('Simulated AI response', 'info');
        setLoading(false);
      }, 1000);

    } catch (err) {
      console.error(err);
      // Fallback in case of fetch exception
      const simReply = generateSimulatedResponse(textToSend);
      setMessages(prev => [...prev, { role: 'assistant', content: simReply }]);
      showToast('Simulated AI response (offline)', 'info');
      setLoading(false);
    }
  };

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

        {/* Suggestion Chips */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 shadow-sm space-y-3">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Quick Suggestions</span>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                className="text-left text-xs text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400 py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 border border-gray-150 dark:border-gray-700/60 font-semibold cursor-pointer transition-all leading-snug"
              >
                {s}
              </button>
            ))}
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
                    <div className="prose dark:prose-invert prose-xs max-w-none space-y-2">
                      {m.content.split('\n').map((line, lIdx) => {
                        if (line.startsWith('###')) {
                          return <h4 key={lIdx} className="font-extrabold text-gray-950 dark:text-white mt-3 uppercase tracking-tight text-xs">{line.replace('###', '').trim()}</h4>;
                        }
                        if (line.startsWith('*')) {
                          return <li key={lIdx} className="ml-3 list-disc text-xs font-medium">{line.replace('*', '').trim()}</li>;
                        }
                        if (line.trim().startsWith('-')) {
                          return <li key={lIdx} className="ml-3 list-dash text-xs font-medium">{line.trim().replace('-', '').trim()}</li>;
                        }
                        return <p key={lIdx} className="text-xs font-semibold">{line}</p>;
                      })}
                    </div>
                  ) : (
                    <p className="font-bold">{m.content}</p>
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
          <div className="flex gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
            <textarea
              rows="1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="flex-1 px-3 py-2 text-xs font-bold outline-none border-none bg-transparent resize-none dark:text-white placeholder-gray-300"
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
