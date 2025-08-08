'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import type { MenuItem } from '@/types';
import { Utensils, Sandwich, Cookie, ArrowRight, Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const categoryIcons: { [key: string]: React.ReactNode } = {
  Breakfast: <Sandwich className="h-6 w-6 text-red-600" />,
  Lunch: <Utensils className="h-6 w-6 text-red-600" />,
  Snacks: <Cookie className="h-6 w-6 text-red-600" />,
};

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function LiveTokenCounter() {
  const [loading, setLoading] = useState(true);
  const [tokensLeft, setTokensLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [view, setView] = useState<'live' | 'soldout' | 'closed' | 'error'>('closed');
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const initialLoadDone = useRef(false);

  async function fetchTokenStatus() {
    try {
      const { data: settings } = await supabase
        .from('token_settings')
        .select('total_tokens, is_active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!settings) throw new Error('No token settings found');

      setIsActive(settings.is_active);
      setTotalTokens(settings.total_tokens);

      const today = getTodayDateString();
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('booking_date', today);

      const remaining = settings.total_tokens - (bookingsCount || 0);
      setTokensLeft(remaining);

      if (!settings.is_active) {
        setView('closed');
      } else if (remaining <= 0) {
        setView('soldout');
      } else {
        setView('live');
      }
    } catch {
      setView('error');
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }

  useEffect(() => {
    fetchTokenStatus();
    const intervalId = setInterval(fetchTokenStatus, 7000);
    return () => clearInterval(intervalId);
  }, []);

  const TokenWrapper = ({ children }: { children: React.ReactNode }) => (
    <Card className="bg-white border border-red-200 rounded-3xl shadow-lg p-6 text-center">
      <div className="mb-3 inline-flex items-center gap-2 bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full font-bold text-sm shadow">
        <Ticket className="h-4 w-4" />
        Biriyani Token
      </div>
      {children}
    </Card>
  );

  const viewContent = {
    loading: <Skeleton className="h-40 w-full rounded-xl" />,
    error: (
      <TokenWrapper>
        <p className="font-bold text-red-600">Error loading token status</p>
      </TokenWrapper>
    ),
    closed: (
      <TokenWrapper>
        <p className="font-semibold text-red-900 text-xl mb-1">Booking Closed</p>
        <p className="text-sm text-gray-600">Please check back later.</p>
      </TokenWrapper>
    ),
    soldout: (
      <TokenWrapper>
        <p className="font-semibold text-yellow-800 text-xl">All Tokens Sold Out</p>
      </TokenWrapper>
    ),
    live: (
      <TokenWrapper>
        <p className="text-red-700 text-sm font-medium mb-1">Booking is LIVE</p>
        <h2 className="text-6xl font-extrabold text-yellow-500 my-3 tracking-wide">{tokensLeft}</h2>
        <p className="text-gray-700 font-medium">tokens remaining</p>
        <Button asChild className="mt-6 w-full bg-yellow-400 text-yellow-900 font-bold py-4 rounded-2xl shadow hover:bg-yellow-500">
          <Link href="/login" className="flex justify-center items-center gap-2">
            Book Now <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </TokenWrapper>
    )
  };

  return loading && !initialLoadDone.current ? viewContent.loading : viewContent[view];
}

function MenuCard({ items, category }: { items: MenuItem[]; category: string }) {
  if (!items.length) return null;
  return (
    <Card className="bg-white border border-red-200 rounded-3xl shadow-md transition p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-red-100 p-2 rounded-full shadow-inner">
          {categoryIcons[category]}
        </div>
        <h3 className="text-xl font-extrabold text-red-800">{category}</h3>
      </div>
      <ul className="space-y-3">
        {items.map(item => (
          <li
            key={item.id}
            className="flex justify-between border-b border-gray-100 pb-2"
            role="listitem"
            tabIndex={0}
            aria-label={`${item.name} priced ₹${item.price.toFixed(2)}`}
          >
            <span className="font-medium text-gray-800 truncate max-w-[70%]">{item.name}</span>
            <span className="text-red-900 font-bold">₹{item.price.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Home() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true);

        if (!mounted) return;

        setMenuItems((data || []).map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          isAvailable: item.is_available,
          createdAt: item.created_at,
        })));
      } catch {
        if (mounted) setMenuItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const categories = ['Breakfast', 'Lunch', 'Snacks'];
  const categorizedMenu = menuItems.reduce((acc, item) => {
    if (item.isAvailable) {
      (acc[item.category] = acc[item.category] || []).push(item);
    }
    return acc;
  }, {} as { [key: string]: MenuItem[] });

  return (
    <div className="min-h-screen bg-gradient-to-tr from-red-50 via-white to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <section className="text-center mb-16">
          <h1 className="text-5xl font-headline font-extrabold text-red-900">Today’s Menu</h1>
          <p className="mt-4 text-lg text-red-700">Freshly made meals just for you</p>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map(c => <Skeleton key={c} className="h-60 rounded-3xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map(cat => categorizedMenu[cat] && (
              <MenuCard key={cat} category={cat} items={categorizedMenu[cat]} />
            ))}
          </div>
        )}

        {!loading && !categories.some(cat => categorizedMenu[cat]) && (
          <p className="text-center mt-20 text-gray-500 font-medium text-lg">
            No menu available yet. Check back soon!
          </p>
        )}

        <section className="mt-24 max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center text-red-800 mb-2 font-headline">Special Biriyani Token</h2>
          <p className="text-center text-red-600 mb-6 text-base">Grab your token before it's gone!</p>
          <LiveTokenCounter />
        </section>
      </main>

      <footer className="text-center py-8 text-sm text-gray-600 border-t mt-16">
        With Love &ndash; College Union CETKR,SFI CETKR Unit!
      </footer>
    </div>
  );
}