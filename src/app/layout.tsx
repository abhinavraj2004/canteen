'use client';

import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&family=Marck+Script&display=swap" rel="stylesheet" />
        <title>Campus Canteen</title>
        <meta name="description" content="Digital portal for your college canteen." />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}