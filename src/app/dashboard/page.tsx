'use client';

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth, User } from "@/hooks/use-auth";
import type { TokenSettings, MenuItem } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { Ticket, Utensils, Sandwich, Cookie, ChefHat } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categoryIcons: { [key: string]: React.ReactNode } = {
  Breakfast: <Sandwich className="h-6 w-6 text-primary" />,
  Lunch: <Utensils className="h-6 w-6 text-primary" />,
  Snacks: <Cookie className="h-6 w-6 text-primary" />,
};

const MAX_TOKENS_PER_USER = 3;

// MenuDisplay component to show menu grouped by category
function MenuDisplay() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true);

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
      } catch (error) {
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
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
    );
  }

  return (
    <div className="space-y-8">
      {Object.keys(categorizedMenu).length > 0 ? (
        Object.entries(categorizedMenu).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              {categoryIcons[category]}
              <h4 className="font-bold text-xl font-headline text-primary">
                {category}
              </h4>
            </div>
            <div className="space-y-3 pl-2 border-l-2 border-primary/50 ml-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-baseline"
                >
                  <p className="text-muted-foreground">{item.name}</p>
                  <p className="font-semibold">Rs.{item.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="text-muted-foreground text-center py-8">
          Menu not available yet.
        </p>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  // The AuthGuard in layout.tsx guarantees that `user` is not null here.
  const { user } = useAuth() as { user: User };
  const { toast } = useToast();

  const [tokenSettings, setTokenSettings] = useState<TokenSettings | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [allBookingsToday, setAllBookingsToday] = useState<any[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [tokensToBook, setTokensToBook] = useState(1);

  // Fetch token settings and bookings
  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);

      const { data: tokenSettingsData } = await supabase
        .from("token_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { data: allBookingsData } = await supabase
        .from("bookings")
        .select("user_id, token_number")
        .eq("booking_date", today);

      const userBookingsData = (allBookingsData || []).filter(
        (b: any) => b.user_id === user.id
      );

      setTokenSettings(
        tokenSettingsData
          ? {
              id: tokenSettingsData.id,
              isActive: tokenSettingsData.is_active,
              totalTokens: tokenSettingsData.total_tokens,
              createdAt: tokenSettingsData.created_at,
            }
          : null
      );

      setAllBookingsToday(allBookingsData || []);
      setUserBookings(userBookingsData);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoadingDashboard(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBookToken = async () => {
    if (!tokenSettings) return;
    setBookingInProgress(true);

    try {
      // Re-fetch latest data just before booking to prevent race conditions
      const { data: latestSettings } = await supabase.from("token_settings").select("is_active, total_tokens").order("created_at", { ascending: false }).limit(1).single();
      const { count: latestBookingsCount } = await supabase.from("bookings").select('id', { count: 'exact', head: true }).eq("booking_date", new Date().toISOString().slice(0, 10));

      const tokensLeft = (latestSettings?.total_tokens || 0) - (latestBookingsCount || 0);

      if (!latestSettings?.is_active || tokensLeft < tokensToBook) {
        toast({
          title: "Booking Failed",
          description: "Not enough tokens left or booking is closed.",
          variant: "destructive",
        });
        fetchData(); // Refresh data to show the user the latest state
        return;
      }

      if (userBookings.length >= MAX_TOKENS_PER_USER) {
        toast({
          title: "Booking Failed",
          description: `You have already booked the maximum of ${MAX_TOKENS_PER_USER} tokens.`,
          variant: "destructive",
        });
        return;
      }
      
      const { data: allBookingsData } = await supabase.from("bookings").select("token_number").eq("booking_date", new Date().toISOString().slice(0, 10));
      let nextTokenNumber = 1;
      if (allBookingsData && allBookingsData.length > 0) {
        nextTokenNumber = Math.max(...allBookingsData.map((b) => b.token_number)) + 1;
      }

      const allowedToBook = Math.min(
        tokensToBook,
        MAX_TOKENS_PER_USER - userBookings.length,
        tokensLeft
      );
      
      if (allowedToBook <= 0) {
         toast({
          title: "Booking Failed",
          description: "No tokens available to book.",
          variant: "destructive",
        });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const tokensToInsert = Array.from({ length: allowedToBook }).map((_, i) => ({
        user_id: user.id,
        user_name: user.name || user.email,
        token_number: nextTokenNumber + i,
        booking_date: today,
      }));

      const { error } = await supabase.from("bookings").insert(tokensToInsert);
      if (error) {
        toast({
          title: "Booking Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success!",
        description: `Booked ${allowedToBook} token${allowedToBook > 1 ? "s" : ""}!`,
      });
      setTokensToBook(1);
      await fetchData(); // Refresh data to show new booking
    } catch (err: any) {
      toast({
        title: "Booking Failed",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setBookingInProgress(false);
    }
  };

  // The main auth loading is handled by AuthGuard. We only show a loader for this page's data.
  if (loadingDashboard) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-4 md:p-8">
          <Skeleton className="h-8 w-1/2 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  const tokensLeft = tokenSettings
    ? tokenSettings.totalTokens - allBookingsToday.length
    : 0;
  const userTokenCount = userBookings.length;
  const canBook =
    tokenSettings?.isActive && tokensLeft > 0 && userTokenCount < MAX_TOKENS_PER_USER;
  const maxCanBook = Math.min(MAX_TOKENS_PER_USER - userTokenCount, tokensLeft);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 font-headline">
          Welcome, {user.name}!
        </h1>
        <Tabs defaultValue="menu">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="menu" className="gap-2">
              <ChefHat /> Today's Menu
            </TabsTrigger>
            <TabsTrigger value="booking" className="gap-2">
              <Ticket /> Token Booking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">
                  Today's Menu
                </CardTitle>
                <CardDescription>Items available at the canteen today.</CardDescription>
              </CardHeader>
              <CardContent>
                <MenuDisplay />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="booking">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 font-headline text-2xl">
                  <Ticket className="text-primary h-8 w-8" />
                  Biriyani Token Booking
                </CardTitle>
                <CardDescription>Book up to 3 tokens for today.</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`p-4 rounded-md text-center font-bold text-lg ${
                    tokenSettings?.isActive && tokensLeft > 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {tokensLeft <= 0
                    ? "Tokens Over!"
                    : tokenSettings?.isActive
                    ? "Booking is LIVE!"
                    : "Booking is CLOSED"}
                </div>
                <div className="text-center my-2">
                  <p className="text-muted-foreground">Tokens Remaining</p>
                  <p className="text-5xl font-bold text-yellow-500">{tokensLeft > 0 ? tokensLeft : 0}</p>
                </div>
                {userBookings.length > 0 && (
                  <div className="flex flex-col items-center gap-1 my-2 w-full">
                    <div className="text-green-800 font-bold mb-1">
                      Your Booked Token{userBookings.length > 1 ? "s" : ""}:
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center w-full">
                      {userBookings.map((b: any) => (
                        <span
                          key={b.token_number}
                          className="text-3xl font-bold text-green-600 bg-white/80 px-4 py-1 rounded-lg border border-green-200"
                        >
                          #{String(b.token_number).padStart(3, "0")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {canBook && (
                  <>
                    <div className="flex items-center gap-2 justify-center my-4">
                      <label
                        htmlFor="select-tokens"
                        className="font-semibold text-lg"
                      >
                        Select tokens to book:
                      </label>
                      <select
                        id="select-tokens"
                        className="border rounded px-2 py-1 text-lg bg-background"
                        value={tokensToBook}
                        onChange={(e) => setTokensToBook(Number(e.target.value))}
                        disabled={bookingInProgress || maxCanBook <= 0}
                      >
                        {Array.from({ length: maxCanBook }).map((_, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            {idx + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      size="lg"
                      className="w-full text-lg py-6 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-lg rounded-2xl transition"
                      onClick={handleBookToken}
                      disabled={bookingInProgress || maxCanBook <= 0}
                    >
                      {bookingInProgress
                        ? "Booking..."
                        : `Book ${tokensToBook} Token${
                            tokensToBook > 1 ? "s" : ""
                          } Now`}
                    </Button>
                  </>
                )}

                {!canBook && userBookings.length >= MAX_TOKENS_PER_USER && (
                  <div className="text-center text-yellow-700 font-bold text-lg mt-4 p-3 bg-yellow-100 rounded-md">
                    You have already booked your maximum of {MAX_TOKENS_PER_USER}{" "}
                    tokens for today.
                  </div>
                )}

                {!canBook && tokensLeft <= 0 && userTokenCount < MAX_TOKENS_PER_USER && (
                  <div className="text-center text-red-700 font-bold text-lg mt-4 p-3 bg-red-100 rounded-md">
                    Sorry, all tokens for today are over!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
