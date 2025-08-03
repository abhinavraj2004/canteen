'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

// A simple, full-page loader that does NOT include the Header.
function FullPageLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      {/* You can replace this with a spinner or a more elaborate skeleton component if you wish */}
      <p className="text-lg text-muted-foreground">Loading...</p>
    </div>
  );
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if authentication is finished and there's no user.
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // While loading, or if there is no user, show the full-page loader.
  // The useEffect above will handle the redirect.
  if (loading || !user) {
    return <FullPageLoader />;
  }

  // If loading is complete and we have a user, render the actual page content.
  return <>{children}</>;
}