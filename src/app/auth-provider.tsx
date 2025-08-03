// Create a /app/auth-provider.tsx
'use client';
import { AuthProvider } from '@/hooks/use-auth';

export default function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
// Then use inside pages or the first client shell.
