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
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          const authUser = session?.user;

          if (authUser) {
            // Set a basic user object immediately.
            // This prevents the UI from getting stuck.
            setUser({
              id: authUser.id,
              email: authUser.email!,
              name: extractName(authUser),
              role: 'student', // Default role
              isAdmin: false,
              isEmailConfirmed: !!authUser.confirmed_at,
            });

            // Fetch the detailed profile in the background.
            // This is wrapped in a try/catch to prevent the app from hanging if RLS fails.
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('name, role')
                .eq('id', authUser.id)
                .single();

              if (profile) {
                const role = profile.role ?? (ADMIN_EMAILS.includes(authUser.email!) ? 'admin' : 'student');
                setUser(currentUser => ({
                  ...currentUser!,
                  name: profile.name ?? currentUser!.name,
                  role: role,
                  isAdmin: role === 'admin',
                }));
              }
            } catch (profileError) {
              console.error("Error fetching profile. Check RLS Policies.", profileError);
            }

          } else {
            setUser(null);
          }
        } finally {
          // This will now always be reached, fixing the infinite loading screen.
          setLoading(false);
        }
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
