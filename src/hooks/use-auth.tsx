'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { AuthUser } from '@supabase/supabase-js';

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
    // Set up the listener for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const authUser = session?.user;

        if (authUser) {
            // User is signed in, first try to fetch their detailed profile
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('name, role')
                .eq('id', authUser.id)
                .single();

            // If there's an error fetching (like RLS issue), log it but don't crash
            if (error) {
                console.error("Auth Notice: Could not fetch user profile. Check RLS policies on 'profiles' table.", error.message);
            }

            const role = profile?.role ?? (ADMIN_EMAILS.includes(authUser.email!) ? 'admin' : 'student');

            // Create the final user object
            setUser({
                id: authUser.id,
                email: authUser.email!,
                name: profile?.name ?? extractName(authUser),
                role: role,
                isAdmin: role === 'admin',
                isEmailConfirmed: !!authUser.confirmed_at,
            });
        } else {
            // User is signed out
            setUser(null);
        }
        
        // Set loading to false once we have a definitive user state (or null)
        setLoading(false);
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
    // Sign up the user
    const { data: authData, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name?.trim() ?? '' } },
    });
    
    // Manually create the profile entry if signup was successful
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