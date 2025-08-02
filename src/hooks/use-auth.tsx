'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type User = {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
  role: 'student' | 'admin';
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

// List of admin emails
const ADMIN_EMAILS = ['abhinavrajt2004@gmail.com', 'abhicetkr@gmail.com']; // <-- Add your admin emails here

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to get user profile from your database
  const fetchUserProfile = async (userId: string, email: string) => {
    // You must have a 'profiles' table with a 'role' column (student/admin)
    const { data, error } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', userId)
      .single();
    if (error || !data) {
      // fallback if no profile, treat as student
      return {
        name: '',
        role: ADMIN_EMAILS.includes(email) ? 'admin' : 'student',
      };
    }
    // fallback if role missing in DB
    return {
      name: data?.name ?? '',
      role: data?.role ?? (ADMIN_EMAILS.includes(email) ? 'admin' : 'student'),
    };
  };

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const email = data.user.email ?? '';
        const id = data.user.id;
        const profile = await fetchUserProfile(id, email);

        setUser({
          id,
          email,
          name: profile.name,
          isAdmin: ADMIN_EMAILS.includes(email) || profile.role === 'admin',
          role: profile.role,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    getSession();

    // Listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const email = session.user.email ?? '';
        const id = session.user.id;
        const profile = await fetchUserProfile(id, email);

        setUser({
          id,
          email,
          name: profile.name,
          isAdmin: ADMIN_EMAILS.includes(email) || profile.role === 'admin',
          role: profile.role,
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const loginWithEmail = async (email: string, password: string): Promise<{ error: any }> => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    return { error };
  };

  /**
   * Signs up user, then inserts into 'profiles' table.
   * Make sure you have a 'profiles' table with columns: id (uuid), email, name, role (default 'student').
   */
  const signupWithEmail = async (email: string, password: string, name?: string): Promise<{ error: any }> => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name || '' }
      }
    });

    let signupError = error;

    // Insert into profiles table if user created
    if (!signupError && data?.user) {
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: data.user.id,
          email: email.trim(),
          name: name || '',
          role: ADMIN_EMAILS.includes(email.trim()) ? 'admin' : 'student',
        }
      ]);
      if (profileError) {
        // Optionally: you can handle/log this error
        // console.error('Error inserting profile:', profileError);
      }
    }
    setLoading(false);
    return { error: signupError };
  };

  const loginWithGoogle = async (): Promise<{ error: any }> => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    setLoading(false);
    return { error };
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  };

  const sendPasswordResetEmail = async (email: string): Promise<{ error: any }> => {
    // You can customize the redirectTo URL for your project
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      loginWithEmail,
      signupWithEmail,
      loginWithGoogle,
      logout,
      sendPasswordResetEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}