'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import AuthGuard from '@/components/AuthGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';

function AdminRoleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') {
      router.replace('/dashboard'); // Redirect non-admins
    }
  }, [user, loading, router]);

  // If loading or user is not an admin yet, show a loading state
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

  // If user is an admin, render the children
  return <>{children}</>;
}


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
        <AdminRoleGuard>
            {children}
        </AdminRoleGuard>
    </AuthGuard>
  );
}