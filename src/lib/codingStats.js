import { supabase } from './supabase';

/**
 * Utility functions for fetching coding profile statistics from various platforms.
 */

/**
 * Fetch LeetCode stats using a community API wrapper
 */
export async function fetchLeetCodeStats(username) {
  if (!username) return null;
  try {
    const response = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${username}`);
    if (!response.ok) throw new Error('Failed to fetch LeetCode stats');
    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0]?.message || 'API Error');
    
    return {
      platform: 'LeetCode',
      username,
      totalSolved: data.totalSolved || 0,
      easySolved: data.easySolved || 0,
      mediumSolved: data.mediumSolved || 0,
      hardSolved: data.hardSolved || 0,
      ranking: data.ranking || 'N/A',
      acceptanceRate: 'N/A'
    };
  } catch (error) {
    console.error('LeetCode API Error:', error);
    return { platform: 'LeetCode', username, status: 'error', error: error.message };
  }
}

export async function fetchAllStats(preferences) {
  if (!preferences) return [];

  const promises = [];
  
  if (preferences.leetcode_username) {
    promises.push(fetchLeetCodeStats(preferences.leetcode_username));
  }

  const results = await Promise.allSettled(promises);
  
  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

/**
 * Syncs recent accepted LeetCode submissions into the DSA problem log.
 * Prevents duplicates by checking existing problem titles.
 */
export async function syncLeetCodeSubmissions(username, userId) {
  if (!username || !userId) return { success: false, added: 0, error: 'Missing username or user ID' };
  
  try {
    // 1. Fetch recent accepted submissions from alfa-leetcode-api
    const response = await fetch(`https://alfa-leetcode-api.onrender.com/${username}/acSubmission`);
    if (!response.ok) throw new Error('Failed to fetch LeetCode submissions');
    
    const data = await response.json();
    if (!data.submission || !Array.isArray(data.submission)) {
      throw new Error('Invalid response from LeetCode API');
    }

    // 2. Fetch existing problems from database to deduplicate
    const { data: existingData, error: dbError } = await supabase
      .from('dsa_problems')
      .select('problem_title')
      .eq('user_id', userId)
      .eq('platform', 'LeetCode');
      
    if (dbError) throw dbError;
    
    const existingTitles = new Set(existingData.map(p => p.problem_title.toLowerCase()));
    
    // 3. Filter new submissions
    const newSubmissions = data.submission
      .filter(sub => !existingTitles.has(sub.title.toLowerCase()))
      // Remove duplicates within the fetched list itself just in case
      .filter((sub, index, self) => 
        index === self.findIndex((s) => s.title.toLowerCase() === sub.title.toLowerCase())
      );

    if (newSubmissions.length === 0) {
      return { success: true, added: 0 };
    }

    // 4. Batch insert
    const insertData = newSubmissions.map(sub => ({
      user_id: userId,
      platform: 'LeetCode',
      problem_title: sub.title,
      // The API doesn't return difficulty in the /acSubmission endpoint easily, so default to Medium 
      // or we can try to guess or just leave it as Medium. Let's use Medium as a safe default.
      difficulty: 'Medium', 
      topic: 'Other', // Unknown from this endpoint
      date_solved: new Date(Number(sub.timestamp) * 1000).toISOString().split('T')[0],
      is_solved: true,
      time_taken_mins: null,
      notes: 'Auto-synced from LeetCode'
    }));

    const { error: insertError } = await supabase
      .from('dsa_problems')
      .insert(insertData);

    if (insertError) throw insertError;

    return { success: true, added: insertData.length };
  } catch (error) {
    console.error('LeetCode Sync Error:', error);
    return { success: false, added: 0, error: error.message };
  }
}

/**
 * Syncs recent accepted Codeforces submissions into the DSA problem log.
 */
export async function syncCodeforcesSubmissions(username, userId) {
  if (!username || !userId) return { success: false, added: 0, error: 'Missing username or user ID' };
  
  try {
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${username}&from=1&count=50`);
    if (!response.ok) throw new Error('Failed to fetch Codeforces submissions');
    
    const data = await response.json();
    if (data.status !== 'OK') throw new Error(data.comment || 'Codeforces API error');

    // Filter only accepted submissions
    const accepted = data.result.filter(sub => sub.verdict === 'OK');

    const { data: existingData, error: dbError } = await supabase
      .from('dsa_problems')
      .select('problem_title')
      .eq('user_id', userId)
      .eq('platform', 'Codeforces');
      
    if (dbError) throw dbError;
    
    const existingTitles = new Set(existingData.map(p => p.problem_title.toLowerCase()));
    
    const newSubmissions = accepted
      .filter(sub => !existingTitles.has(sub.problem.name.toLowerCase()))
      .filter((sub, index, self) => 
        index === self.findIndex((s) => s.problem.name.toLowerCase() === sub.problem.name.toLowerCase())
      );

    if (newSubmissions.length === 0) {
      return { success: true, added: 0 };
    }

    const insertData = newSubmissions.map(sub => ({
      user_id: userId,
      platform: 'Codeforces',
      problem_title: sub.problem.name,
      difficulty: sub.problem.rating ? (sub.problem.rating < 1200 ? 'Easy' : sub.problem.rating < 1900 ? 'Medium' : 'Hard') : 'Medium',
      topic: sub.problem.tags?.length > 0 ? sub.problem.tags[0] : 'Other',
      date_solved: new Date(sub.creationTimeSeconds * 1000).toISOString().split('T')[0],
      is_solved: true,
      time_taken_mins: null,
      notes: 'Auto-synced from Codeforces'
    }));

    const { error: insertError } = await supabase
      .from('dsa_problems')
      .insert(insertData);

    if (insertError) throw insertError;

    return { success: true, added: insertData.length };
  } catch (error) {
    console.error('Codeforces Sync Error:', error);
    return { success: false, added: 0, error: error.message };
  }
}

/**
 * Universal sync function dispatcher
 */
export async function syncSubmissions(platform, username, userId) {
  if (platform === 'LeetCode') return syncLeetCodeSubmissions(username, userId);
  if (platform === 'Codeforces') return syncCodeforcesSubmissions(username, userId);
  return { success: false, added: 0, error: `${platform} sync is not supported.` };
}

