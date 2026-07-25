import React, { useMemo } from 'react';
import { Activity, Code2, Flame, Trophy } from 'lucide-react';

export default function DSAHeatmap({ problems }) {
  // Heatmap calculations
  const heatmapData = useMemo(() => {
    const today = new Date();
    const map = new Map();
    
    // Initialize last 120 days (approx 4 months)
    for (let i = 119; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      map.set(dateStr, 0);
    }

    // Populate counts
    problems.forEach(p => {
      if (p.is_solved && p.date_solved) {
        if (map.has(p.date_solved)) {
          map.set(p.date_solved, map.get(p.date_solved) + 1);
        }
      }
    });

    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }, [problems]);

  // Max streak calculation
  const currentStreak = useMemo(() => {
    let streak = 0;
    const sortedDates = [...heatmapData].reverse();
    for (const { count } of sortedDates) {
      if (count > 0) streak++;
      else break;
    }
    return streak;
  }, [heatmapData]);

  // Distribution calculations
  const distribution = useMemo(() => {
    const byPlatform = {};
    const byDiff = { Easy: 0, Medium: 0, Hard: 0 };
    
    problems.forEach(p => {
      if (!p.is_solved) return;
      
      // Platform
      const plat = p.platform || 'Custom';
      byPlatform[plat] = (byPlatform[plat] || 0) + 1;
      
      // Difficulty
      if (p.difficulty) {
        byDiff[p.difficulty] = (byDiff[p.difficulty] || 0) + 1;
      }
    });
    
    return { byPlatform, byDiff };
  }, [problems]);

  const platformColors = {
    LeetCode: 'bg-orange-500',
    Codeforces: 'bg-blue-500',
    CodeChef: 'bg-amber-600',
    Custom: 'bg-emerald-500'
  };

  const getIntensityClass = (count) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count <= 1) return 'bg-[#10B981]/30';
    if (count <= 3) return 'bg-[#10B981]/60';
    if (count <= 5) return 'bg-[#10B981]/80';
    return 'bg-[#10B981]';
  };

  return (
    <div className="space-y-6">
      {/* Heatmap Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#10B981]" />
            Activity History
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-100 dark:border-orange-800/50">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{currentStreak} Day Streak</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800/50">
              <Trophy className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{problems.filter(p => p.is_solved).length} Total</span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="flex flex-wrap gap-1 md:gap-1.5">
          {heatmapData.map((day, idx) => (
            <div 
              key={idx} 
              title={`${day.count} problems on ${day.date}`}
              className={`w-3 h-3 md:w-4 md:h-4 rounded-sm transition-colors cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-[#10B981] dark:hover:ring-offset-gray-900 ${getIntensityClass(day.count)}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 mt-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
          <div className="w-3 h-3 rounded-sm bg-[#10B981]/30" />
          <div className="w-3 h-3 rounded-sm bg-[#10B981]/60" />
          <div className="w-3 h-3 rounded-sm bg-[#10B981]/80" />
          <div className="w-3 h-3 rounded-sm bg-[#10B981]" />
          <span>More</span>
        </div>
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Platform Distribution */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-gray-400" />
            Platform Usage
          </h3>
          <div className="space-y-4">
            {Object.entries(distribution.byPlatform).sort((a, b) => b[1] - a[1]).map(([plat, count]) => {
              const total = problems.filter(p => p.is_solved).length || 1;
              const pct = Math.round((count / total) * 100);
              const colorClass = platformColors[plat] || 'bg-gray-500';
              return (
                <div key={plat}>
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                    <span>{plat}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${colorClass} transition-all duration-1000`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(distribution.byPlatform).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No platform data available.</p>
            )}
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gray-400" />
            Difficulty Spread
          </h3>
          <div className="flex items-end justify-center h-32 gap-6 pb-2 border-b border-gray-100 dark:border-gray-800">
            {['Easy', 'Medium', 'Hard'].map((diff) => {
              const count = distribution.byDiff[diff];
              const max = Math.max(...Object.values(distribution.byDiff), 1);
              const height = count ? `${(count / max) * 100}%` : '0%';
              const color = diff === 'Easy' ? 'bg-emerald-400' : diff === 'Medium' ? 'bg-amber-400' : 'bg-red-400';
              
              return (
                <div key={diff} className="flex flex-col items-center gap-2 w-16 group">
                  <span className="text-xs font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{count || 0}</span>
                  <div className={`w-full rounded-t-md ${color} transition-all duration-1000 relative group-hover:brightness-110`} style={{ height: height === '0%' ? '4px' : height }} />
                  <span className="text-xs font-bold text-gray-400 uppercase">{diff[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
