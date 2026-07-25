import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchAllStats, syncSubmissions } from '../lib/codingStats';
import { SkeletonCard } from './ui/Skeleton';
import { useToast } from './ui/Toast';
import { Trophy, Code2, Star, TrendingUp, AlertCircle, RefreshCw, DownloadCloud } from 'lucide-react';

export default function CodingStatsWidget({ onSyncSuccess, problems = [] }) {
  const { user, preferences } = useAuth();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Compute today's solved count from local problems array
  const todayStr = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
  const todaySolvedCount = problems.filter(p => p.date_solved === todayStr).length;

  const loadStats = async () => {
    if (!preferences) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllStats(preferences);
      setStats(data);
    } catch (err) {
      setError('Failed to fetch some coding statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  const hasAnyProfile = preferences && preferences.leetcode_username;

  if (!hasAnyProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-8 text-center flex flex-col items-center justify-center">
        <Code2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2">No LeetCode Profile Linked</h3>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          Link your LeetCode account in Settings to track your stats here in real-time.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Live Coding Stats
        </h3>
        <button 
          onClick={loadStats}
          className="p-2 text-gray-400 hover:text-emerald-500 transition-colors bg-gray-50 dark:bg-gray-800 rounded-full"
          title="Refresh Stats"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold p-3 rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/30">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats[0] && <StatCard stat={stats[0]} user={user} onSyncSuccess={onSyncSuccess} />}
        
        {/* Daily Solved Card */}
        <div className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/10 border-2 rounded-2xl p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Trophy className="w-32 h-32 text-emerald-500" />
          </div>
          
          <div>
            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider mb-1">Daily Solved</h4>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate mb-4">Today's Progress</p>
          </div>
          
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{todaySolvedCount}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pb-1">Problems</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ stat, user, onSyncSuccess }) {
  const [syncing, setSyncing] = useState(false);
  const [localTotalSolved, setLocalTotalSolved] = useState(stat.totalSolved);
  const { showToast } = useToast();
  
  useEffect(() => {
    setLocalTotalSolved(stat.totalSolved);
  }, [stat.totalSolved]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    const result = await syncSubmissions(stat.platform, stat.username, user.id);
    setSyncing(false);
    if (result.success) {
      showToast(`Synced ${result.added} new ${stat.platform} submissions!`);
      if (result.added > 0) {
        if (stat.platform === 'LeetCode') setLocalTotalSolved(prev => prev + result.added);
        if (onSyncSuccess) onSyncSuccess();
      }
    } else {
      showToast(result.error || `Failed to sync ${stat.platform}`, 'error');
    }
  };
  if (stat.status === 'unsupported' || stat.status === 'error') {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-center opacity-70">
         <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider mb-1">{stat.platform}</h4>
         <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate mb-4">@{stat.username}</p>
         <div className="text-xs font-semibold text-gray-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {stat.status === 'error' ? 'API Error' : 'Not Supported'}
         </div>
      </div>
    );
  }

  let content = null;
  let themeClass = '';

  if (stat.platform === 'LeetCode') {
    themeClass = 'border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/10';
    content = (
      <>
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{localTotalSolved}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pb-1">Solved</span>
          </div>
          <button 
            onClick={handleSync}
            disabled={syncing}
            title="Sync recent submissions to Problem Log"
            className="p-1.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors disabled:opacity-50"
          >
            {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold">
          <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded uppercase tracking-wider">E: {stat.easySolved}</span>
          <span className="text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded uppercase tracking-wider">M: {stat.mediumSolved}</span>
          <span className="text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded uppercase tracking-wider">H: {stat.hardSolved}</span>
        </div>
      </>
    );
  } else if (stat.platform === 'Codeforces') {
    themeClass = 'border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/10';
    content = (
      <>
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{stat.rating}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pb-1">Rating</span>
          </div>
          <button 
            onClick={handleSync}
            disabled={syncing}
            title="Sync recent submissions to Problem Log"
            className="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors disabled:opacity-50"
          >
            {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-blue-500" /> Max: {stat.maxRating}</span>
          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-blue-500" /> Rank: {stat.rank}</span>
        </div>
      </>
    );
  } else if (stat.platform === 'CodeChef') {
    themeClass = 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10';
    content = (
      <>
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{stat.rating}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pb-1">Rating</span>
          </div>
          <button 
            onClick={handleSync}
            disabled={syncing}
            title="Sync recent submissions to Problem Log"
            className="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors disabled:opacity-50"
          >
            {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <span className="flex items-center gap-1 text-amber-500"><Star className="w-3 h-3" /> {stat.stars || '0★'}</span>
          <span>Global Rank: {stat.globalRank || 'N/A'}</span>
        </div>
      </>
    );
  }

  return (
    <div className={`border rounded-2xl p-5 relative overflow-hidden transition-all hover:shadow-md ${themeClass}`}>
      <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider mb-1">{stat.platform}</h4>
      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate mb-4">@{stat.username}</p>
      {content}
    </div>
  );
}
