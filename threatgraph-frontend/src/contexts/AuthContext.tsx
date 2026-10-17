import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USER = {
  id: 'usr-demo-analyst',
  email: 'analyst@threatgraph.ai',
  app_metadata: {},
  user_metadata: { name: 'Senior SecOps Analyst' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for active evaluation session
    const guestActive = localStorage.getItem('threatgraph_guest_session');
    if (guestActive) {
      const storedEmail = localStorage.getItem('threatgraph_user_email');
      setUser({
        ...DEMO_USER,
        ...(storedEmail ? { email: storedEmail } : {})
      } as unknown as User);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      // Unauthenticated by default when Supabase is unconfigured
      setUser(null);
      setLoading(false);
      return;
    }

    // Get initial Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      // Simulate successful login with input email
      const customUser = {
        ...DEMO_USER,
        email,
      } as unknown as User;
      setUser(customUser);
      localStorage.setItem('threatgraph_guest_session', 'true');
      localStorage.setItem('threatgraph_user_email', email);
      return {};
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const customUser = {
        ...DEMO_USER,
        email,
      } as unknown as User;
      setUser(customUser);
      localStorage.setItem('threatgraph_guest_session', 'true');
      localStorage.setItem('threatgraph_user_email', email);
      return {};
    }
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message };
  };

  const signInAsGuest = () => {
    setUser(DEMO_USER);
    localStorage.setItem('threatgraph_guest_session', 'true');
    localStorage.removeItem('threatgraph_user_email');
  };

  const signOut = async () => {
    localStorage.removeItem('threatgraph_guest_session');
    localStorage.removeItem('threatgraph_user_email');
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) return {};
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        configured: isSupabaseConfigured,
        signIn,
        signUp,
        signInAsGuest,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
