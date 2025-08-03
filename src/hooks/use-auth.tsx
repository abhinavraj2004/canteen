'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ---------- Types ----------
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

// ---------- Helpers ----------
const ADMIN_EMAILS = ['abhinavrajt2004@gmail.com', 'abhicetkr@gmail.com'];

function extractUserName(user: any, fallbackName?: string): string {
  return (
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.user_name ||
    fallbackName ||
    user?.email ||
    ''
  ).trim();
}

async function upsertProfile(supabase: any, user: any, fallbackName?: string) {
  if (!user) return;
  const id = user.id;
  const email = user.email ?? '';
  let name = extractUserName(user, fallbackName);
  if (!id || !email) return;
  const updates: any = {
    id,
    email,
    role: ADMIN_EMAILS.includes(email) ? 'admin' : 'student',
  };
  if (name) updates.name = name;
  await supabase.from('profiles').upsert(updates, { onConflict: ['id'] });
}

// ---------- Provider ----------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string, email: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', userId)
      .single();
    return {
      name: data?.name ?? '',
      role: data?.role ?? (ADMIN_EMAILS.includes(email) ? 'admin' : 'student'),
    };
  };

  const handleProfileUpsert = async (authUser: any, fallbackName?: string) => {
    await upsertProfile(supabase, authUser, fallbackName);
    const email = authUser.email ?? '';
    const id = authUser.id;
    const isEmailConfirmed = !!authUser?.confirmed_at || !!authUser?.email_confirmed_at;
    const profile = await fetchUserProfile(id, email);
    setUser({
      id,
      email,
      name: profile.name,
      isAdmin: ADMIN_EMAILS.includes(email) || profile.role === 'admin',
      role: profile.role,
      isEmailConfirmed,
    });
  };

  // REFRESH USER
  const refreshUser = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const authUser = data?.user;
    if (authUser) {
      await handleProfileUpsert(authUser);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  // On mount, always check session and listen for changes
  useEffect(() => {
    refreshUser();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user;
      if (authUser) {
        await handleProfileUpsert(authUser);
      } else {
        setUser(null);
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
    // eslint-disable-next-line
  }, []);

  // ------- AUTH HELPERS -------
  const loginWithEmail = async (email: string, password: string): Promise<{ error: any }> => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    await refreshUser(); // get latest user
    setLoading(false);
    return { error };
  };

  const signupWithEmail = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ error: any }> => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name || '' },
      },
    });
    let userId = data?.user?.id;
    let authUser = data?.user;
    if (!userId) {
      const start = Date.now();
      while (Date.now() - start < 10000) {
        const { data: sessionData } = await supabase.auth.getUser();
        if (sessionData?.user?.id) {
          userId = sessionData.user.id;
          authUser = sessionData.user;
          break;
        }
        await new Promise((res) => setTimeout(res, 350));
      }
    }
    if (authUser && name) {
      authUser.user_metadata = { ...(authUser.user_metadata || {}), name };
    }
    if (userId && authUser) {
      await handleProfileUpsert(authUser, name);
    }
    await refreshUser();
    setLoading(false);
    return { error };
  };

  const loginWithGoogle = async (): Promise<{ error: any }> => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    await refreshUser();
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  // ------------- RENDER -----------
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

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}