'use client';

import React from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Favicon and theme */}
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#f1f5f9" />

        {/* Google Fonts, if needed */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&family=Marck+Script&display=swap"
          rel="stylesheet"
        />

        {/* Basic SEO */}
        <title>CETKR Canteen</title>
        <meta name="description" content="Digital portal for your college canteen." />
        <meta property="og:title" content="CETKR Canteen" />
        <meta property="og:description" content="Digital portal for your college canteen." />
        <meta property="og:type" content="website" />
      </head>
      <body className="font-body antialiased bg-slate-50 min-h-screen flex flex-col">
        {/* Put ALL providers inside 'use client' component */}
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
