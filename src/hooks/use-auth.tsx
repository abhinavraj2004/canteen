'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

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

// -- Change these to your admin emails --
const ADMIN_EMAILS = [
  'abhinavrajt@gmail.com',
  'abhicetkr@gmail.com',
];

function extractName(user: any, fallback?: string): string {
  return (
    user?.user_metadata?.name ??
    user?.user_metadata?.full_name ??
    user?.user_metadata?.user_name ??
    fallback ??
    user?.email ??
    ''
  ).trim();
}

import type { SupabaseClient } from '@supabase/supabase-js';

async function upsertProfile(supabase: SupabaseClient, user: any, fallback?: string) {
  if (!user) return;
  const id = user.id;
  const email = user.email ?? '';
  if (!id || !email) return;

  const name = extractName(user, fallback);

  try {
    await supabase.from('profiles').upsert(
      {
        id,
        email,
        name,
        role: ADMIN_EMAILS.includes(email) ? 'admin' : 'student',
      },
      { onConflict: 'id' }
    );
  } catch (error) {
    console.error('Failed to upsert profile:', error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchUserProfile(id: string, email: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', id)
        .single();

      if (error) {
        // Fallback to default role
        console.warn('Failed fetching profile:', error.message);
        return {
          name: '',
          role: ADMIN_EMAILS.includes(email) ? 'admin' : 'student',
        };
      }
      return {
        name: data?.name ?? '',
        role: data?.role ?? (ADMIN_EMAILS.includes(email) ? 'admin' : 'student'),
      };
    } catch (err) {
      console.error('Exception fetching profile:', err);
      return {
        name: '',
        role: ADMIN_EMAILS.includes(email) ? 'admin' : 'student',
      };
    }
  }

  async function setAuthUser(authUser: any, fallbackName?: string) {
    if (!authUser) {
      setUser(null);
      return;
    }
    await upsertProfile(supabase, authUser, fallbackName);

    const id = authUser.id;
    const email = authUser.email ?? '';
    const isEmailConfirmed = Boolean(authUser.confirmed_at ?? authUser.email_confirmed);

    const profile = await fetchUserProfile(id, email);

    setUser({
      id,
      email,
      name: profile.name,
      role: profile.role,
      isAdmin: ADMIN_EMAILS.includes(email) || profile.role === 'admin',
      isEmailConfirmed,
    });
  }

  const refreshUser = async () => {
    setLoading(true);
    try {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        // Handle refresh token errors
        if (
          (error instanceof Error && error.message.includes('Invalid refresh token')) ||
          (typeof error.message === 'string' && error.message.includes('Invalid refresh token'))
        ) {
          await supabase.auth.signOut();
        }
        setUser(null);
      } else if (authUser) {
        await setAuthUser(authUser);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
      console.error('Unexpected auth getUser error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isUnmounted = false;
    setLoading(true);

    async function initialize() {
      try {
        await refreshUser();
      } catch (e) {
        setUser(null);
        console.error('Error initializing user:', e);
      } finally {
        if (!isUnmounted) setLoading(false);
      }
    }

    initialize();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (!session?.user) {
            setUser(null);
          } else {
            await setAuthUser(session.user);
          }
        } catch (e) {
          setUser(null);
        }
      }
    );

    return () => {
      subscription?.subscription.unsubscribe();
      isUnmounted = true;
    };
  }, []);

  // ==== Auth helper methods ====

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      await refreshUser();
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name ?? '',
          },
        },
      });

      // If user isn't immediately available, poll for up to 10 seconds
      let authUser = data?.user;
      if (!authUser) {
        const start = Date.now();
        while (Date.now() - start < 10000) {
          const { data: sessionData } = await supabase.auth.getUser();
          if (sessionData?.user) {
            authUser = sessionData.user;
            break;
          }
          await new Promise(res => setTimeout(res, 350));
        }
      }
      if (authUser && name) {
        authUser.user_metadata = { ...(authUser.user_metadata ?? {}), name };
      }
      if (authUser) await setAuthUser(authUser, name);
      await refreshUser();
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      await refreshUser();
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (e) {
      setUser(null);
      console.error('Error during logout:', e);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Ensure the correct name! ----------
  const sendPasswordResetEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (e) {
      return { error: e };
    }
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
        sendPasswordResetEmail, // <-- note the correct name
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