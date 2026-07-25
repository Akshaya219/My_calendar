import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ── Shared Context ────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading]         = useState(true);
  const initialised = useRef(false); // prevent double-init from onAuthStateChange

  // ── Apply theme ───────────────────────────────────────────────────────────
  const applyTheme = useCallback((theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme || 'light');
  }, []);

  // ── Fetch preferences ─────────────────────────────────────────────────────
  const fetchPreferences = useCallback(async (userId) => {
    if (!userId) { setPreferences(null); return; }
    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setPreferences(data || null);
      applyTheme(data?.theme);
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
    }
  }, [applyTheme]);

  // ── Session bootstrap — runs exactly once ─────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // Safety net: never spin longer than 5 seconds
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    // onAuthStateChange fires reliably on every session event.
    // Using it as the single source of truth avoids the race between
    // getSession() and onAuthStateChange() both calling fetchPreferences.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchPreferences(currentUser.id);
        } else {
          setPreferences(null);
        }

        // Resolve loading after the FIRST event (INITIAL_SESSION or SIGNED_IN)
        if (!initialised.current) {
          initialised.current = true;
          if (mounted) {
            clearTimeout(safetyTimer);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchPreferences]);

  // ── refreshPreferences: called after Settings saves ───────────────────────
  const refreshPreferences = useCallback(async () => {
    if (user) await fetchPreferences(user.id);
  }, [user, fetchPreferences]);

  return (
    <AuthContext.Provider value={{ user, preferences, loading, refreshPreferences }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
