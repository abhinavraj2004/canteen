'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { AuthUser, Session } from '@supabase/supabase-js';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // This function processes a session to set the user state.
    const processSession = async (session: Session | null) => {
      const authUser = session?.user;

      if (authUser) {
          const { data: profile, error } = await supabase
              .from('profiles')
              .select('name, role')
              .eq('id', authUser.id)
              .single();

          if (error) {
              console.error("Auth Notice: Could not fetch user profile. Check RLS policies on 'profiles' table.", error.message);
          }

          const role = profile?.role ?? (ADMIN_EMAILS.includes(authUser.email!) ? 'admin' : 'student');

          setUser({
              id: authUser.id,
              email: authUser.email!,
              name: profile?.name ?? extractName(authUser),
              role: role,
              isAdmin: role === 'admin',
              isEmailConfirmed: !!authUser.confirmed_at,
          });
      } else {
          setUser(null);
      }
    };

    // --- The Fix ---
    // 1. Check for an existing session on initial component mount.
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await processSession(session);
      setLoading(false); // CRITICAL: Set loading to false after the initial check.
    };

    checkInitialSession();

    // 2. Set up the listener for any subsequent changes in auth state.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await processSession(session);
        setLoading(false); // Also ensure loading is false on state changes.
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signupWithEmail = async (email: string, password: string, name?: string) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name?.trim() ?? '' } },
    });
    
    if (authData.user) {
        const role = ADMIN_EMAILS.includes(authData.user.email!) ? 'admin' : 'student';
        await supabase.from('profiles').insert({
            id: authData.user.id,
            email: authData.user.email,
            name: name?.trim() ?? extractName(authData.user),
            role: role
        });
    }
    return { error };
  };

  const loginWithGoogle = async () => {
    return supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const sendPasswordResetEmail = async (email: string) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}