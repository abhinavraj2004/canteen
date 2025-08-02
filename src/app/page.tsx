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

const categoryIcons: { [key: string]: React.ReactNode } = {
  'Breakfast': <Sandwich className="h-8 w-8 text-primary" />,
  'Lunch': <Utensils className="h-8 w-8 text-primary" />,
  'Snacks': <Cookie className="h-8 w-8 text-primary" />,
};

function getTodayDateString() {
  // This matches most dashboards: local date in YYYY-MM-DD
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function LiveTokenCounter() {
  const [tokensLeft, setTokensLeft] = useState<number|null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTokensLeft = async () => {
    setLoading(true);

    // Get total_tokens from token_settings
    const { data: settings } = await supabase
      .from('token_settings')
      .select('total_tokens')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const today = getTodayDateString();

    // Always match dashboard logic: count bookings for today (local date)
    const { count: bookingsCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('booking_date', today);

    if (settings && typeof bookingsCount === 'number') {
      setTokensLeft(settings.total_tokens - bookingsCount);
    } else if (settings) {
      setTokensLeft(settings.total_tokens);
    } else {
      setTokensLeft(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTokensLeft();
    const interval = setInterval(fetchTokensLeft, 5000);
    return () => clearInterval(interval);
  }, []);

  // Show "Tokens Over" state
  if (!loading && tokensLeft !== null && tokensLeft <= 0) {
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-fit mb-4">
          <div className="
            flex items-center gap-5 px-10 py-8 rounded-3xl shadow-xl
            bg-gradient-to-br from-yellow-200 via-yellow-100 to-yellow-50
            border-2 border-yellow-400
          ">
            <span className="flex items-center justify-center text-yellow-600 text-4xl bg-yellow-100 rounded-full p-4 shadow-inner border-2 border-yellow-300">
              <Ticket className="h-8 w-8" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-wide flex items-center gap-2 drop-shadow text-red-700">
                Tokens Over!
              </div>
              <div className="mt-1 text-base text-red-600 font-semibold">
                Booking ended for today.
              </div>
            </div>
          </div>
          <div className="absolute left-0 right-0 bottom-0 h-5 rounded-3xl bg-yellow-400 opacity-20 blur-md -z-10" />
        </div>
        <Button size="lg" disabled className="font-bold text-lg px-8 py-6 bg-gray-200 text-gray-500 shadow-none rounded-2xl mt-2 cursor-not-allowed">
          Booking Closed
        </Button>
      </div>
    );
  }

  // Show "LIVE" state or loading
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-fit mb-4">
        <div className="
          flex items-center gap-5 px-10 py-8 rounded-3xl shadow-xl
          bg-gradient-to-br from-yellow-200 via-yellow-100 to-yellow-50
          border-2 border-yellow-400
        ">
          <span className="flex items-center justify-center text-yellow-600 text-4xl bg-yellow-100 rounded-full p-4 shadow-inner border-2 border-yellow-300">
            <Ticket className="h-8 w-8" />
          </span>
          <div>
            <div className="text-2xl font-extrabold text-yellow-800 tracking-wide flex items-center gap-2 drop-shadow">
              Booking is <span className="text-yellow-500 ml-1">LIVE!</span>
            </div>
            <div className="text-yellow-900 text-base font-semibold">
              {loading
                ? <Skeleton className="h-5 w-24 mt-1" />
                : tokensLeft !== null
                  ? (<span className="text-2xl font-extrabold text-yellow-700 drop-shadow">{tokensLeft}</span>)
                  : (<span className="text-destructive">?</span>)
              }
              <span className="ml-1">Tokens Left</span>
            </div>
          </div>
        </div>
        <div className="absolute left-0 right-0 bottom-0 h-5 rounded-3xl bg-yellow-400 opacity-20 blur-md -z-10" />
      </div>
      <Button asChild size="lg" className="font-bold text-lg px-8 py-6 group bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-xl rounded-2xl transition mt-2">
        <Link href="/login">
          Book Your Token Now <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </Button>
    </div>
  );
}

function MenuCard({ items, category }: { items: MenuItem[], category: string }) {
  if (items.length === 0) return null;
  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-6">
        {categoryIcons[category]}
        <h3 className="font-menu text-4xl text-primary">{category}</h3>
      </div>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex justify-between items-baseline gap-4">
            <p className="text-lg text-foreground font-semibold">{item.name}</p>
            <div className="flex-1 border-b-2 border-dotted border-muted-foreground/30"></div>
            <p className="text-lg font-bold text-foreground">Rs.{item.price.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

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
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category,
            isAvailable: item.is_available,
            createdAt: item.created_at,
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
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-1">
        <section id="menu" className="w-full py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-extrabold font-headline tracking-tight text-primary">Today's Menu</h1>
              <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">Freshly prepared meals at the Campus Canteen.</p>
            </div>

            <Card className="max-w-4xl mx-auto p-6 sm:p-10 bg-card/80 backdrop-blur-sm border-2 border-primary/20 shadow-2xl">
              <CardContent>
                {loading ? (
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full" />
                    ))}
                  </div>
                ) : Object.keys(categorizedMenu).length > 0 ? (
                  <div className="grid gap-x-12 gap-y-16 md:grid-cols-2">
                    {['Breakfast', 'Lunch', 'Snacks'].map(category => (
                      categorizedMenu[category] && (
                        <MenuCard key={category} items={categorizedMenu[category]} category={category} />
                      )
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground text-xl">The menu for today hasn't been set yet. Please check back later!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="relative w-full py-16 md:py-24 text-center bg-secondary/30">
          <div className="container relative mx-auto px-4 flex flex-col items-center gap-8">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold font-headline text-foreground">Special Biriyani Token</h2>
              <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">Book your special meal token hassle-free. Limited spots available!</p>
            </div>
            <LiveTokenCounter />
          </div>
        </section>
      </main>
      <footer className="w-full py-6 bg-secondary text-foreground mt-12">
        <div className="container mx-auto text-center">
          <p>With love, College Union CETKR</p>
        </div>
      </footer>
    </div>
  );
}