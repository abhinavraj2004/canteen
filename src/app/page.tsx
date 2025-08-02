'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import type { MenuItem, TokenSettings } from '@/types';
import { Utensils, Sandwich, Cookie, ArrowRight, Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const categoryIcons: { [key: string]: React.ReactNode } = {
  'Breakfast': <Sandwich className="h-8 w-8 text-primary" />,
  'Lunch': <Utensils className="h-8 w-8 text-primary" />,
  'Snacks': <Cookie className="h-8 w-8 text-primary" />,
};

function LiveTokenCounter() {
  const [tokenSettings, setTokenSettings] = useState<TokenSettings | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('token_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setTokenSettings({
        isActive: data.is_active,
        totalTokens: data.total_tokens,
        tokensLeft: data.tokens_left,
        createdAt: data.created_at,
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchSettings();

    const interval = setInterval(fetchSettings, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-secondary/50 border-primary/20">
      <CardContent className="p-4 flex items-center justify-center gap-4">
        <Ticket className="h-8 w-8 text-primary" />
        <div className="text-center">
          <p className="font-bold text-primary">
            {tokenSettings?.isActive ? "Booking is LIVE!" : "Booking is CLOSED"}
          </p>
          <div className="text-sm text-muted-foreground">
            {
              loading ? <Skeleton className="h-5 w-24 mt-1" />
              : tokenSettings
                ? `${tokenSettings.tokensLeft} Tokens Left`
                : <Skeleton className="h-5 w-24 mt-1" />
            }
          </div>
        </div>
      </CardContent>
    </Card>
  )
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
            <p className="text-lg font-bold text-foreground">₹{item.price.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      const { data, error } = await supabase
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
    <div className="flex flex-col min-h-screen bg-background">
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
                <Button asChild size="lg" className="font-bold text-lg px-8 py-6 group bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/login">
                        Book Your Token Now <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                </Button>
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