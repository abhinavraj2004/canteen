'use client';

import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/hooks/use-auth';
import './globals.css';

// Optionally add your favicon and Open Graph tags in the <head>
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Favicons (optional) */}
        <link rel="icon" type="image/png" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#f1f5f9" />

        {/* Preconnects and Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&family=Marck+Script&display=swap"
          rel="stylesheet"
        />

        {/* Metadata */}
        <title>CETKR Canteen</title>
        <meta name="description" content="Digital portal for your college canteen." />
        {/* Open Graph / Twitter card tags (Optional, recommended for SEO) */}
        <meta property="og:title" content="CETKR Canteen" />
        <meta property="og:description" content="Digital portal for your college canteen." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CETKR Canteen" />
      </head>
      <body
        className="font-body antialiased bg-slate-50 min-h-screen flex flex-col"
        // Optionally: add more classes for global background / transitions here
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
