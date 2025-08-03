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
    console.log("AuthProvider: Subscribing to auth state changes...");

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("AuthProvider: onAuthStateChange event fired. Event type:", _event);
        
        try {
          const authUser = session?.user;

          if (authUser) {
              console.log("AuthProvider: User found in session. Fetching profile for ID:", authUser.id);
              const { data: profile, error } = await supabase
                  .from('profiles')
                  .select('name, role')
                  .eq('id', authUser.id)
                  .single();

              if (error) {
                  console.error("AuthProvider: Error fetching user profile. This is normal if the profile is new. Message:", error.message);
              }

              const role = profile?.role ?? (ADMIN_EMAILS.includes(authUser.email!) ? 'admin' : 'student');
              const finalUser = {
                  id: authUser.id,
                  email: authUser.email!,
                  name: profile?.name ?? extractName(authUser),
                  role: role,
                  isAdmin: role === 'admin',
                  isEmailConfirmed: !!authUser.confirmed_at,
              };

              console.log("AuthProvider: Setting user state:", finalUser);
              setUser(finalUser);
          } else {
              console.log("AuthProvider: No user in session. Setting user to null.");
              setUser(null);
          }
        } catch (e) {
            console.error("AuthProvider: An unexpected error occurred inside the auth listener.", e);
        } finally {
            // This is the most critical part. It ensures loading is always set to false.
            console.log("AuthProvider: Auth state processed. Setting loading to false.");
            setLoading(false);
        }
      }
    );

    return () => {
      console.log("AuthProvider: Unsubscribing from auth listener.");
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
