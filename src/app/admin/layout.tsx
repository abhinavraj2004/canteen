'use client';

import AuthGuard from '@/components/AuthGuard';
import AdminAuthGuard from '@/components/AdminAuthGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
        <AdminAuthGuard>
            {children}
        </AdminAuthGuard>
    </AuthGuard>
  );
}