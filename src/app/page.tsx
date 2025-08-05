'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import type { MenuItem } from '@/types';
import { Utensils, Sandwich, Cookie, ArrowRight, Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// --- ICONS (Styled for the new theme) ---
const categoryIcons: { [key: string]: React.ReactNode } = {
  'Breakfast': <Sandwich className="h-8 w-8 text-emerald-600" />,
  'Lunch': <Utensils className="h-8 w-8 text-emerald-600" />,
  'Snacks': <Cookie className="h-8 w-8 text-emerald-600" />,
};

// --- HELPER FUNCTION ---
function getTodayDateString() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

// --- LIVE TOKEN COUNTER WITH FLICKER-FREE LOGIC ---
function LiveTokenCounter() {
  const [tokensLeft, setTokensLeft] = useState<number | null>(null);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Use a ref to avoid showing stale UI between request/response
  const [viewState, setViewState] = useState<'loading' | 'live' | 'closed' | 'error'>('loading');
  const [tokensToShow, setTokensToShow] = useState<number>(0);

  const fetchTokensStatus = async () => {
    try {
      setLoading(true);
      setHasError(false);

      // Fetch settings
      const { data: settings, error: settingsError } = await supabase
        .from('token_settings')
        .select('total_tokens, is_active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (settingsError) {
        setHasError(true);
        setViewState('error');
        setLoading(false);
        return;
      }

      // Fetch bookings count
      const today = getTodayDateString();
      const { count: bookingsCount, error: bookingsError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('booking_date', today);

      if (bookingsError) {
        setHasError(true);
        setViewState('error');
        setLoading(false);
        return;
      }

      setIsActive(settings.is_active);

      let tokensLeftNow: number;
      if (typeof bookingsCount === 'number') {
        tokensLeftNow = settings.total_tokens - bookingsCount;
      } else {
        tokensLeftNow = settings.total_tokens;
      }
      setTokensLeft(tokensLeftNow);
      setTokensToShow(tokensLeftNow);

      // Decide what to show
      if (!settings.is_active) {
        setViewState('closed');
      } else if (tokensLeftNow <= 0) {
        setViewState('closed');
      } else {
        setViewState('live');
      }
      setLoading(false);
    } catch (err) {
      setHasError(true);
      setViewState('error');
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const safeFetch = async () => {
      if (isMounted) {
        setLoading(true);
        setViewState('loading');
        await fetchTokensStatus();
      }
    };

    safeFetch();
    const interval = setInterval(() => {
      safeFetch();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // --- UI rendering based strictly on viewState ---
  if (viewState === 'loading') {
    return (
      <Card className="w-full max-w-md p-6 sm:p-8 text-center shadow-lg border-emerald-200/50">
        <CardContent className="p-0 flex flex-col items-center gap-2">
          <Skeleton className="h-8 w-1/3 mb-2" />
          <h3 className="text-gray-600 font-medium text-xl mt-2">Tokens Remaining</h3>
          <Skeleton className="h-20 w-40 my-2 bg-gray-200" />
          <Skeleton className="h-12 w-2/3 mt-4" />
        </CardContent>
      </Card>
    );
  }

  if (viewState === 'error') {
    return (
      <Card className="w-full max-w-md p-8 text-center bg-gray-100 border-gray-200 shadow-sm">
        <CardContent className="p-0 flex flex-col items-center gap-4">
          <Ticket className="h-12 w-12 text-gray-400" />
          <h3 className="text-2xl font-bold text-gray-800">
            Could not load booking status
          </h3>
          <p className="text-gray-500">
            Please refresh the page or try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (viewState === 'closed') {
    return (
      <Card className="w-full max-w-md p-8 text-center bg-gray-100 border-gray-200 shadow-sm">
        <CardContent className="p-0 flex flex-col items-center gap-4">
          <Ticket className="h-12 w-12 text-gray-400" />
          <h3 className="text-2xl font-bold text-gray-800">
            {isActive === false ? "Booking is Closed" : "Booking Closed for Today"}
          </h3>
          <p className="text-gray-500">
            {isActive === false
              ? "Token booking is currently not active. Please check back later!"
              : "All tokens for the special meal have been booked. Please check back tomorrow!"
            }
          </p>
          <Button size="lg" disabled className="w-full mt-4 font-bold text-lg py-6 rounded-xl">
            See You Tomorrow
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Only show "Booking is Live!" when not loading and booking is active and tokens remain
  return (
    <Card className="w-full max-w-md p-6 sm:p-8 text-center shadow-lg border-emerald-200/50">
      <CardContent className="p-0 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 text-emerald-600">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <p className="font-semibold text-lg">Booking is Live!</p>
        </div>
        <h3 className="text-gray-600 font-medium text-xl mt-2">Tokens Remaining</h3>
        <p className="text-7xl sm:text-8xl font-bold text-emerald-600 my-2 tracking-tighter">
          {tokensToShow}
        </p>
        <Button asChild size="lg" className="w-full mt-4 font-bold text-lg py-7 group bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-transform duration-300 hover:scale-105">
          <Link href="/login">
            Book Your Token Now
            <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// --- MENU CARD ---
function MenuCard({ items, category }: { items: MenuItem[], category: string }) {
  if (items.length === 0) return null;

  return (
    <Card className="w-full shadow-md hover:shadow-xl transition-shadow duration-300 border-transparent hover:border-emerald-200">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-emerald-50 p-3 rounded-full">
             {categoryIcons[category]}
          </div>
          <h3 className="font-menu text-3xl font-bold text-slate-800">{category}</h3>
        </div>
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center gap-4">
              <p className="text-base text-slate-700 font-medium">{item.name}</p>
              <div className="flex-1 border-b border-dashed border-slate-300 mx-2"></div>
              <p className="text-base font-semibold text-slate-800 whitespace-nowrap">₹{item.price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- MAIN HOME PAGE ---
export default function Home() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true);

      if (data) {
        setMenuItems(
          data.map((item: any) => ({
            id: item.id, name: item.name, price: item.price, category: item.category,
            isAvailable: item.is_available, createdAt: item.created_at,
          }))
        );
      } else {
        setMenuItems([]);
      }
      setLoading(false);
    };
    fetchMenu();
  }, []);

  const categorizedMenu = menuItems.reduce((acc, item) => {
    if (item.isAvailable) {
      (acc[item.category] = acc[item.category] || []).push(item);
    }
    return acc;
  }, {} as { [key: string]: MenuItem[] });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />
      <main className="flex-1">
        {/* --- MENU SECTION --- */}
        <section id="menu" className="w-full py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-extrabold font-headline tracking-tight text-slate-900">Today's Menu</h1>
              <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-slate-600">Freshly prepared meals at the Campus Canteen.</p>
            </div>

            {loading ? (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
              </div>
            ) : Object.keys(categorizedMenu).length > 0 ? (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {['Breakfast', 'Lunch', 'Snacks'].map(category => (
                  categorizedMenu[category] && <MenuCard key={category} items={categorizedMenu[category]} category={category} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                <p className="text-slate-500 text-xl">The menu for today hasn't been set yet. Please check back later!</p>
              </div>
            )}
          </div>
        </section>

        {/* --- TOKEN BOOKING SECTION --- */}
        <section className="w-full py-16 md:py-24 text-center bg-white mt-8">
          <div className="container mx-auto px-4 flex flex-col items-center gap-8">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold font-headline text-slate-900">Special Biriyani Token</h2>
              <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-slate-600">Book your special meal token hassle-free. Limited spots available!</p>
            </div>
            <LiveTokenCounter />
          </div>
        </section>
      </main>
      
      {/* --- FOOTER --- */}
      <footer className="w-full py-6 bg-slate-100 text-slate-600 mt-12 border-t border-slate-200">
        <div className="container mx-auto text-center">
          <p>With love, College Union CETKR</p>
        </div>
      </footer>
    </div>
  );
}