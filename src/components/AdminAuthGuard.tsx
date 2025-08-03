'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

function FullPageLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <p className="text-lg text-muted-foreground">Verifying access...</p>
    </div>
  );
}

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'admin') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  // Show a loader until we have a confirmed admin user.
  if (loading || !user || user.role !== 'admin') {
    return <FullPageLoader />;
  }

  // If the user is a confirmed admin, render the page.
  return <>{children}</>;
}