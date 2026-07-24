import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  const fetchPreferences = useCallback(async (userId) => {
    if (!userId) {
      setPreferences(null);
      setLoadingPrefs(false);
      return;
    }
    setLoadingPrefs(true);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      setPreferences(data || null);
      
      // Apply theme
      const currentTheme = data?.theme || 'light';
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (err) {
      console.error('Failed to fetch user preferences:', err);
    } finally {
      setLoadingPrefs(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchPreferences(currentUser.id);
        } else {
          setLoadingPrefs(false);
        }
      } catch (err) {
        console.error('Auth hook error:', err);
        setLoadingPrefs(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchPreferences(currentUser.id);
      } else {
        setPreferences(null);
        setLoadingPrefs(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchPreferences]);

  return {
    user,
    preferences,
    loading: loading || loadingPrefs,
    refreshPreferences: () => user && fetchPreferences(user.id),
  };
}

