'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import type { MenuItem } from '@/types';
import { Utensils, Sandwich, Cookie, ArrowRight, Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const categoryIcons: { [key: string]: React.ReactNode } = {
  Breakfast: <Sandwich className="h-6 w-6 text-white" />, 
  Lunch: <Utensils className="h-6 w-6 text-white" />, 
  Snacks: <Cookie className="h-6 w-6 text-white" />,
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

  const viewContent = {
    loading: (
      <Skeleton className="h-60 w-full rounded-xl" />
    ),
    error: (
      <Card className="bg-red-50 text-red-800 text-center p-6">
        <Ticket className="mx-auto mb-2" />
        <p className="font-bold">Error loading tokens</p>
      </Card>
    ),
    closed: (
      <Card className="bg-gray-100 text-gray-700 p-6 text-center">
        <Ticket className="mx-auto mb-2" />
        <p className="font-semibold">Booking Closed</p>
        <p className="text-sm">Try again later.</p>
      </Card>
    ),
    soldout: (
      <Card className="bg-yellow-100 text-yellow-800 p-6 text-center">
        <Ticket className="mx-auto mb-2" />
        <p className="font-semibold">All Tokens Sold Out</p>
      </Card>
    ),
    live: (
      <Card className="bg-gradient-to-br from-emerald-100 to-white text-center p-6">
        <p className="text-sm font-medium text-emerald-600">Booking is Live</p>
        <h2 className="text-4xl font-extrabold text-emerald-800 my-2">{tokensLeft}</h2>
        <p className="text-gray-700">tokens left</p>
        <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
          <Link href="/login">Book Now <ArrowRight className="inline ml-2" /></Link>
        </Button>
      </Card>
    )
  };

  return loading && !initialLoadDone.current ? viewContent.loading : viewContent[view];
}

function MenuCard({ items, category }: { items: MenuItem[]; category: string }) {
  if (!items.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow hover:shadow-lg transition p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-emerald-600 p-2 rounded-full">
          {categoryIcons[category]}
        </div>
        <h3 className="text-xl font-bold text-gray-900">{category}</h3>
      </div>
      <ul className="space-y-3">
        {items.map(item => (
          <li key={item.id} className="flex justify-between border-b border-gray-100 pb-2">
            <span className="font-medium text-gray-800 truncate max-w-[70%]">{item.name}</span>
            <span className="text-gray-900 font-bold">₹{item.price.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
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
    <div className="min-h-screen bg-emerald-50">
      <Header />
      <main className="max-w-screen-xl mx-auto px-6 py-16">
        <section className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-emerald-900">Today’s Menu</h1>
          <p className="mt-4 text-lg text-gray-700">Freshly made meals just for you</p>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map(c => <Skeleton key={c} className="h-60 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map(cat => categorizedMenu[cat] && (
              <MenuCard key={cat} category={cat} items={categorizedMenu[cat]} />
            ))}
          </div>
        )}

        {!loading && !categories.some(cat => categorizedMenu[cat]) && (
          <p className="text-center mt-20 text-gray-500 font-medium">No menu available yet. Check back soon!</p>
        )}

        <section className="mt-24 max-w-md mx-auto">
          <h2 className="text-3xl font-bold text-center text-emerald-800 mb-2">Special Biriyani Token</h2>
          <p className="text-center text-gray-600 mb-6">Grab your token before it's gone!</p>
          <LiveTokenCounter />
        </section>
      </main>
      <footer className="text-center py-8 text-sm text-gray-600 border-t mt-12">
        With Love &ndash; College Union CETKR!
      </footer>
    </div>
  );
}
