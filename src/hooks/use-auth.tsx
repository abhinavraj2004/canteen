'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { AuthUser, SupabaseClient } from '@supabase/supabase-js';

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

async function upsertProfile(supabase: SupabaseClient, user: AuthUser, fallbackName?: string) {
  if (!user?.id || !user?.email) return;

  const name = extractName(user, fallbackName);
  const role = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'student';

  try {
    console.log("AuthProvider: Upserting profile for", user.email);
    const { error } = await supabase.from('profiles').upsert({ id: user.id, email: user.email, name, role }, { onConflict: 'id' });
    if (error) {
        console.error('AuthProvider: Failed to upsert profile:', error);
    } else {
        console.log("AuthProvider: Profile upserted successfully.");
    }
  } catch (error) {
    console.error('AuthProvider: Exception during profile upsert:', error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`AuthProvider: Auth event - ${event}`);
        
        // --- Critical Change: Set loading to false immediately ---
        // This unblocks the UI, then we fetch user details.
        setLoading(false);

        if (session?.user) {
            console.log("AuthProvider: Session found. Fetching user details...");
            await upsertProfile(supabase, session.user);

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('name, role')
                .eq('id', session.user.id)
                .single();
            
            if (error) {
                console.error("AuthProvider: Error fetching profile from DB:", error.message);
                // Set user with basic info even if profile fetch fails
                const role = ADMIN_EMAILS.includes(session.user.email!) ? 'admin' : 'student';
                setUser({
                    id: session.user.id,
                    email: session.user.email!,
                    name: extractName(session.user),
                    role: role,
                    isAdmin: role === 'admin',
                    isEmailConfirmed: !!session.user.confirmed_at,
                });
            } else {
                 console.log("AuthProvider: Profile fetched successfully. Setting user.");
                const finalRole = profile?.role ?? (ADMIN_EMAILS.includes(session.user.email!) ? 'admin' : 'student');
                setUser({
                    id: session.user.id,
                    email: session.user.email!,
                    name: profile?.name ?? extractName(session.user),
                    role: finalRole,
                    isAdmin: finalRole === 'admin',
                    isEmailConfirmed: !!session.user.confirmed_at,
                });
            }
        } else {
            console.log("AuthProvider: No session found. Clearing user.");
            setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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
    if (data.user) {
        await upsertProfile(supabase, data.user, name);
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