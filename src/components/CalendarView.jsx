import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarView({ userId, selectedDate, onDateSelect, supabase, refreshTrigger = 0 }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const [y, m, d] = selectedDate.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, 1);
  });
  const [monthTasks, setMonthTasks] = useState({});
  const [loading, setLoading] = useState(true);

  // Helper to format Date to YYYY-MM-DD
  const formatDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    // Sync currentMonth if selectedDate changes drastically
    const [y, m] = selectedDate.split('-');
    const newMonth = new Date(parseInt(y), parseInt(m) - 1, 1);
    if (newMonth.getFullYear() !== currentMonth.getFullYear() || newMonth.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(newMonth);
    }
  }, [selectedDate]);

  useEffect(() => {
    async function fetchAllEvents() {
      if (!userId) return;
      setLoading(true);
      
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const startStr = formatDateStr(firstDay);
      const endStr = formatDateStr(lastDay);

      // 1. Fetch Regular Tasks
      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, date, priority, is_completed')
        .eq('user_id', userId)
        .gte('date', startStr)
        .lte('date', endStr);

      // 2. Fetch Syllabus Progress (Targets & Revisions)
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
        .eq('user_id', userId)
        .or(`target_date.gte.${startStr},next_revision_date.gte.${startStr}`);

      const eventsByDate = {};

      // Process Tasks
      taskData?.forEach(t => {
        if (!eventsByDate[t.date]) eventsByDate[t.date] = [];
        eventsByDate[t.date].push({ ...t, type: 'task' });
      });

      // Process Syllabus Events
      progressData?.forEach(p => {
        const name = p.dsa_subtopics?.name || p.gate_subtopics?.name || 'Syllabus Topic';
        
        // Target Date
        if (p.target_date && p.target_date >= startStr && p.target_date <= endStr) {
          if (!eventsByDate[p.target_date]) eventsByDate[p.target_date] = [];
          eventsByDate[p.target_date].push({ 
            id: `target-${p.dsa_subtopic_id || p.gate_subtopic_id}`, 
            title: `Target: ${name}`, 
            priority: 'medium', 
            type: 'target',
            is_completed: p.is_completed 
          });
        }

        // Revision Date
        if (p.next_revision_date && p.next_revision_date >= startStr && p.next_revision_date <= endStr) {
          if (!eventsByDate[p.next_revision_date]) eventsByDate[p.next_revision_date] = [];
          eventsByDate[p.next_revision_date].push({ 
            id: `rev-${p.dsa_subtopic_id || p.gate_subtopic_id}`, 
            title: `Revise: ${name}`, 
            priority: 'high', 
            type: 'revision' 
          });
        }
      });

      setMonthTasks(eventsByDate);
      setLoading(false);
    }
    
    fetchAllEvents();
  }, [currentMonth, userId, supabase, refreshTrigger]);


  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysArray = [];
    const firstDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      daysArray.push({ date, dateStr: formatDateStr(date), isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      daysArray.push({ date, dateStr: formatDateStr(date), isCurrentMonth: true });
    }
    
    // Next month padding
    const remainingDays = 42 - daysArray.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      daysArray.push({ date, dateStr: formatDateStr(date), isCurrentMonth: false });
    }
    
    return daysArray;
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect(formatDateStr(today));
  };

  const todayStr = formatDateStr(new Date());

  const getPriorityBg = (t) => {
    if (t.is_completed) return 'bg-gray-100 text-gray-400 dark:bg-gray-700/50 dark:text-gray-500 line-through';
    if (t.type === 'revision') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
    if (t.type === 'target') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    
    const p = t.priority?.toLowerCase();
    if (p === 'high') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    if (p === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'; 
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'; 
  };


  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer"
          >
            Today
          </button>
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-3">
        {/* Days of week header */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="min-h-[56px] sm:min-h-[80px] bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((day, i) => {
              const isToday = day.dateStr === todayStr;
              const isSelected = day.dateStr === selectedDate;
              const dayTasks = monthTasks[day.dateStr] || [];
              const visibleDots = dayTasks.slice(0, 3);
              const extraTasksCount = dayTasks.length - 3;

              return (
                <button
                  key={i}
                  onClick={() => onDateSelect(day.dateStr)}
                  className={`
                    relative min-h-[56px] sm:min-h-[80px] flex flex-col p-1 sm:p-2 rounded-lg border border-transparent
                    transition-colors cursor-pointer group
                    ${!day.isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'}
                    ${isSelected 
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 ring-1 ring-emerald-500 dark:ring-emerald-400' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                  `}
                >
                  {/* Date number */}
                  <span className={`
                    text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-emerald-600 text-white' : ''}
                    ${isSelected && !isToday ? 'text-emerald-700 dark:text-emerald-300 font-bold' : ''}
                  `}>
                    {day.date.getDate()}
                  </span>

                  {/* Task indicators */}
                  <div className="mt-1 flex flex-col gap-1 w-full pt-1">
                    {visibleDots.map((t, idx) => (
                      <div
                        key={idx}
                        className={`text-[9px] sm:text-[10px] font-medium truncate px-1 py-0.5 rounded ${getPriorityBg(t)} text-left`}
                        title={t.title}
                      >

                        {t.title}
                      </div>
                    ))}
                    {extraTasksCount > 0 && (
                      <div className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none text-left pl-1">
                        +{extraTasksCount} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
