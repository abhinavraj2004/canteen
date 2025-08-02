'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { TokenSettings, MenuItem } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { Ticket, Utensils, Sandwich, Cookie, ChefHat } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categoryIcons: { [key: string]: React.ReactNode } = {
  'Breakfast': <Sandwich className="h-6 w-6 text-primary" />,
  'Lunch': <Utensils className="h-6 w-6 text-primary" />,
  'Snacks': <Cookie className="h-6 w-6 text-primary" />,
};

const MAX_TOKENS_PER_USER = 3;

function MenuDisplay() {
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
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as { [key: string]: MenuItem[] });

  if (loading) {
    return (
      <div className="space-y-8 p-1">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {Object.keys(categorizedMenu).length > 0 ? (
        Object.entries(categorizedMenu).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              {categoryIcons[category]}
              <h4 className="font-bold text-xl font-headline text-primary">{category}</h4>
            </div>
            <div className="space-y-3 pl-2 border-l-2 border-primary/50 ml-3">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-baseline">
                  <p className="text-muted-foreground">{item.name}</p>
                  <p className="font-semibold">₹{item.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="text-muted-foreground text-center py-8">Menu not available yet.</p>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [tokenSettings, setTokenSettings] = useState<TokenSettings | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [tokensToBook, setTokensToBook] = useState(1);

  // Fetch Token Settings from Supabase
  const fetchTokenSettings = async (): Promise<TokenSettings | null> => {
    const { data } = await supabase
      .from('token_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (!data) return null;
    return {
      isActive: data.is_active,
      totalTokens: data.total_tokens,
      tokensLeft: data.tokens_left,
      createdAt: data.created_at,
      id: data.id,
    };
  };

  // Fetch all today's bookings for this user
  const fetchUserBookings = async (userId: string): Promise<any[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .eq('booking_date', today.toISOString().slice(0, 10))
      .order('token_number', { ascending: true });
    return data || [];
  };

  // Book Token (multiple at once)
  const supabaseBookToken = async (user: any, count: number) => {
    const tokenSettings = await fetchTokenSettings();
    if (!tokenSettings?.isActive) {
      return { success: false, message: "Booking is closed." };
    }
    if (tokenSettings.tokensLeft < count) {
      return { success: false, message: "Not enough tokens left." };
    }

    const bookings = await fetchUserBookings(user.id);
    if (bookings.length >= MAX_TOKENS_PER_USER) {
      return { success: false, message: "You already booked 3 tokens today." };
    }

    const allowed = Math.min(count, MAX_TOKENS_PER_USER - bookings.length, tokenSettings.tokensLeft);
    if (allowed <= 0) {
      return { success: false, message: "Limit reached or sold out." };
    }

    const { data: allBookings } = await supabase
      .from('bookings')
      .select('token_number')
      .eq('booking_date', new Date().toISOString().slice(0, 10))
      .order('token_number', { ascending: false })
      .limit(1);

    let nextTokenNumber = allBookings && allBookings.length > 0 ? allBookings[0].token_number + 1 : 1;

    const tokensToInsert = Array.from({ length: allowed }).map((_, i) => ({
      user_id: user.id,
      user_name: user.name || user.email,
      token_number: nextTokenNumber + i,
      booking_date: new Date().toISOString().slice(0, 10),
    }));

    const { data: bookingData, error: insertErr } = await supabase
      .from('bookings')
      .insert(tokensToInsert)
      .select();

    if (insertErr || !bookingData) {
      return { success: false, message: "Booking failed. Try again." };
    }

    await supabase
      .from('token_settings')
      .update({ tokens_left: tokenSettings.tokensLeft - allowed })
      .eq('id', tokenSettings.id);

    return {
      success: true,
      message: `Booked ${allowed} token${allowed > 1 ? "s" : ""}!`,
      tokenNumbers: tokensToInsert.map(t => t.token_number),
    };
  };

  // On load: fetch settings & bookings, show tickets if already booked
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role === 'admin') {
      router.push('/admin');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const [settings, bookings] = await Promise.all([
        fetchTokenSettings(),
        fetchUserBookings(user.id),
      ]);
      setTokenSettings(settings);
      setUserBookings(bookings);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // After booking, show just booked tokens
  const [justBookedTokens, setJustBookedTokens] = useState<number[]>([]);
  const handleBookToken = async () => {
    if (!user) return;
    setBookingInProgress(true);
    const result = await supabaseBookToken(user, tokensToBook);
    if (result.success && result.tokenNumbers) {
      toast({ title: "Success!", description: result.message });
      const bookings = await fetchUserBookings(user.id);
      setUserBookings(bookings);
      setJustBookedTokens(result.tokenNumbers);
      const settings = await fetchTokenSettings();
      setTokenSettings(settings);
    } else {
      toast({
        title: "Booking Failed",
        description: result.message,
        variant: "destructive",
      });
    }
    setBookingInProgress(false);
  };

  // If already has bookings, "justBookedTokens" should be synced to userBookings to properly show them on refresh
  useEffect(() => {
    if (userBookings.length > 0) {
      setJustBookedTokens(userBookings.map(b => b.token_number));
    }
  }, [userBookings]);

  if (loading || !user) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-4 md:p-8">
          <Skeleton className="h-8 w-1/2 mb-8" />
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </>
    );
  }

  const canBook = tokenSettings?.isActive &&
    (tokenSettings.tokensLeft > 0) &&
    userBookings.length < MAX_TOKENS_PER_USER &&
    justBookedTokens.length === 0; // Don't show booking UI if already booked

  const maxCanBook = Math.min(
    MAX_TOKENS_PER_USER - userBookings.length,
    tokenSettings?.tokensLeft ?? 0
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 font-headline">Welcome, {user.name}!</h1>

        <Tabs defaultValue="menu" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="menu" className="gap-2"><ChefHat /> Today's Menu</TabsTrigger>
            <TabsTrigger value="booking" className="gap-2"><Ticket /> Token Booking</TabsTrigger>
          </TabsList>

          <TabsContent value="menu">
            <Card className="shadow-lg mt-4">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Today's Menu</CardTitle>
                <CardDescription>Items available at the canteen today.</CardDescription>
              </CardHeader>
              <CardContent>
                <MenuDisplay />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="booking">
            <Card className="shadow-lg mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 font-headline text-2xl">
                  <Ticket className="text-primary h-8 w-8" />
                  Biriyani Token Booking
                </CardTitle>
                <CardDescription>Book up to 3 tokens for today.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-md text-center font-bold text-lg ${tokenSettings?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {tokenSettings?.isActive ? "Booking is LIVE!" : "Booking is CLOSED"}
                </div>
                <div className="text-center my-2">
                  <p className="text-muted-foreground">Tokens Remaining</p>
                  <p className="text-5xl font-bold text-primary">{tokenSettings?.tokensLeft}</p>
                </div>

                <div className="my-6 flex flex-col items-center gap-3">
                  {/* Only show select & button if not booked */}
                  {canBook && (
                    <div className="flex items-center gap-2">
                      <label htmlFor="select-tokens" className="font-semibold text-lg">
                        Select tokens to book:
                      </label>
                      <select
                        id="select-tokens"
                        className="border rounded px-2 py-1 text-lg"
                        value={tokensToBook}
                        onChange={e => setTokensToBook(Number(e.target.value))}
                        disabled={bookingInProgress || maxCanBook === 1}
                      >
                        {Array.from({ length: maxCanBook }).map((_, idx) => (
                          <option key={idx + 1} value={idx + 1}>{idx + 1}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Always show booked tokens if booked */}
                  {justBookedTokens.length > 0 && (
                    <div className="flex flex-col items-center gap-1 my-2 w-full">
                      <div className="text-green-800 font-bold mb-1">
                        Booked Token Number{justBookedTokens.length > 1 ? 's' : ''}:
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center w-full">
                        {justBookedTokens.map((num, idx) => (
                          <span key={idx} className="text-3xl font-bold text-green-600 bg-white/80 px-4 rounded-lg border border-green-200">
                            #{String(num).padStart(3, '0')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                {canBook && (
                  <Button
                    size="lg"
                    className="w-full text-lg py-6 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-lg rounded-2xl transition"
                    onClick={handleBookToken}
                    disabled={!canBook || bookingInProgress}
                  >
                    {bookingInProgress
                      ? "Booking..."
                      : `Book ${tokensToBook} Token${tokensToBook > 1 ? "s" : ""} Now`}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}