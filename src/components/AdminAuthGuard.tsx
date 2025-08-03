'use-client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until loading is false before checking the user role.
    if (!loading) {
      if (!user) {
        // This case is handled by the parent AuthGuard, but as a fallback.
        router.replace('/login');
      } else if (user.role !== 'admin') {
        // If the user is not an admin, redirect them.
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  // If auth is loading, or if the user is not an admin yet, show a loader.
  if (loading || !user || user.role !== 'admin') {
     return (
        <>
            <Header />
            <div className="container mx-auto p-4 md:p-8">
                <Skeleton className="h-8 w-1/2 mb-8" />
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
      </>
    );
  }

  // If loading is finished and the user is an admin, show the page content.
  return <>{children}</>;
}