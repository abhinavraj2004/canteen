'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User as AuthUser, SupabaseClient } from '@supabase/supabase-js';

// Your custom User type
export type User = {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
  role: 'student' | 'admin';
  isEmailConfirmed: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signupWithEmail: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  loginWithGoogle: () => Promise<{ error: any }>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: any }>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = ['abhinavrajt@gmail.com', 'abhicetkr@gmail.com'];

function extractName(user: AuthUser, fallback?: string): string {
  return (
    user?.user_metadata?.name ??
    user?.user_metadata?.full_name ??
    fallback ??
    user?.email ??
    ''
  ).trim();
}

async function upsertProfile(supabase: SupabaseClient, user: AuthUser, fallbackName?: string) {
  if (!user?.id || !user?.email) return;

  const name = extractName(user, fallbackName);
  const role = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'student';

  try {
    await supabase.from('profiles').upsert({ id: user.id, email: user.email, name, role }, { onConflict: 'id' });
  } catch (error) {
    console.error('Failed to upsert profile:', error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const setSessionUser = useCallback(async (authUser: AuthUser | null, fallbackName?: string) => {
    if (!authUser) {
      setUser(null);
      return;
    }

    // Ensure profile exists
    await upsertProfile(supabase, authUser, fallbackName);

    // Fetch the canonical profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', authUser.id)
      .single();

    const finalRole = profile?.role ?? (ADMIN_EMAILS.includes(authUser.email!) ? 'admin' : 'student');

    setUser({
      id: authUser.id,
      email: authUser.email!,
      name: profile?.name ?? extractName(authUser),
      role: finalRole,
      isAdmin: finalRole === 'admin',
      isEmailConfirmed: !!authUser.confirmed_at,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    await setSessionUser(session?.user ?? null);
    setLoading(false);
  }, [setSessionUser]);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await setSessionUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [setSessionUser]);

  const loginWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signupWithEmail = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name?.trim() ?? '' } },
    });
    // Manually upsert profile here since the auth hook might not fire instantly
    if (data.user) {
        await setSessionUser(data.user, name);
    }
    return { error };
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const sendPasswordResetEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout,
        sendPasswordResetEmail,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}