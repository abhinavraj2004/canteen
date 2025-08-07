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
import type { TokenSettings, MenuItem, Booking } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import {
  Ticket,
  Utensils,
  Sandwich,
  Cookie,
  ChefHat,
  X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

// IMAGE: ![image1](image1)

const categoryIcons: { [category: string]: React.ReactNode } = {
  Breakfast: <Sandwich className="h-6 w-6 text-blue-600" aria-hidden="true" />,
  Lunch: <Utensils className="h-6 w-6 text-blue-600" aria-hidden="true" />,
  Snacks: <Cookie className="h-6 w-6 text-blue-600" aria-hidden="true" />,
};

const MAX_TOKENS_PER_USER = 3;

function MenuDisplay() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenu() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true);

        if (data) {
          const formatted = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category,
            isAvailable: item.is_available,
            createdAt: item.created_at,
          }));

          setMenuItems(formatted);
        } else {
          setMenuItems([]);
        }
      } catch {
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  const categorizedMenu = menuItems.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as { [key: string]: MenuItem[] });

  if (loading) {
    return (
      <div className="space-y-8 p-2" aria-busy="true" aria-label="Loading menu items">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-5 animate-pulse">
            <div className="h-8 w-1/3 rounded bg-blue-200" />
            <div className="space-y-3">
              <div className="h-5 w-full rounded bg-gray-300" />
              <div className="h-5 w-5/6 rounded bg-gray-300" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-10" aria-live="polite">
      {Object.keys(categorizedMenu).length > 0 ? (
        Object.entries(categorizedMenu).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center gap-4 mb-5" aria-label={`${category} category`}>
              {categoryIcons[category]}
              <h4 className="text-2xl font-extrabold text-blue-700 font-headline">{category}</h4>
            </div>
            <div className="space-y-4 pl-4 border-l-4 border-blue-400 ml-4">
              {items.map(({ id, name, price }) => (
                <div
                  key={id}
                  className="flex justify-between items-center"
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${name} priced Rs.${price.toFixed(2)}`}
                >
                  <p className="truncate font-semibold text-gray-800">{name}</p>
                  <p className="font-semibold text-blue-600">Rs. {price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500 text-lg mt-6">Menu not available yet.</p>
      )}
    </section>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth() as { user: User };
  const { toast } = useToast();

  const [tokenSettings, setTokenSettings] = useState<TokenSettings | null>(null);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [tokensLeft, setTokensLeft] = useState(0);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [tokensToBook, setTokensToBook] = useState(1);
  const [cancellingTokenId, setCancellingTokenId] = useState<string | null>(null);
  const [alertOpenId, setAlertOpenId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoadingDashboard(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      const { data: settingsData } = await supabase
        .from("token_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { data: userBookingsData } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .eq("booking_date", today);

      const { count: totalBookingsCount } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("booking_date", today);

      const mappedSettings: TokenSettings | null = settingsData
        ? {
            id: settingsData.id,
            isActive: settingsData.is_active,
            totalTokens: settingsData.total_tokens,
            createdAt: settingsData.created_at,
          }
        : null;
      setTokenSettings(mappedSettings);

      const mappedBookings: Booking[] = (userBookingsData || []).map((b) => ({
        id: b.id,
        userId: b.user_id,
        userName: b.user_name,
        tokenNumber: b.token_number,
        bookingDate: b.booking_date,
        createdAt: b.created_at,
        is_confirmed: b.is_confirmed,
      }));
      setUserBookings(mappedBookings);

      setTokensLeft((mappedSettings?.totalTokens || 0) - (totalBookingsCount || 0));
    } catch (error: any) {
      toast({
        title: "Failed to load dashboard",
        description: error.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setLoadingDashboard(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fix: restrict tokensToBook so that user doesn't exceed MAX_TOKENS_PER_USER
  useEffect(() => {
    const userTokenCount = userBookings.length;
    const maxCanBook = Math.min(MAX_TOKENS_PER_USER - userTokenCount, tokensLeft);

    // If tokensToBook is more than maxCanBook, reset it to maxCanBook or 1
    if (tokensToBook > maxCanBook) {
      setTokensToBook(maxCanBook > 0 ? maxCanBook : 1);
    }
  }, [userBookings, tokensLeft, tokensToBook]);

  const handleBookToken = async () => {
    if (!user) return;

    const userTokenCount = userBookings.length;
    const maxCanBook = Math.min(MAX_TOKENS_PER_USER - userTokenCount, tokensLeft);

    // Prevent booking more than allowed
    if (userTokenCount >= MAX_TOKENS_PER_USER || tokensToBook > maxCanBook || tokensToBook < 1) {
      toast({
        title: "Booking Restricted",
        description: `You can only book up to ${MAX_TOKENS_PER_USER} tokens per day.`,
        variant: "destructive",
      });
      return;
    }

    setBookingInProgress(true);

    try {
      const { data, error } = await supabase.rpc("book_tokens", {
        booking_user_id: user.id,
        booking_user_name: user.name,
        num_tokens_to_book: tokensToBook,
      });

      if (error) {
        toast({
          title: "Booking Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Token(s) booked successfully!",
          variant: "default",
        });
        await fetchData();
      }
    } catch (err: any) {
      toast({
        title: "Booking Failed",
        description: err.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!user) return;
    setCancellingTokenId(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId)
        .eq("user_id", user.id);

      if (error) {
        toast({
          title: "Cancellation Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Booking cancelled",
          variant: "default",
        });
        await fetchData();
      }
    } catch (err: any) {
      toast({
        title: "Cancellation Failed",
        description: err.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setCancellingTokenId(null);
      setAlertOpenId(null);
    }
  };

  if (loadingDashboard) {
    return (
      <>
        <Header />
        <main
          className="container mx-auto p-6 flex flex-col items-center justify-center min-h-screen"
          aria-busy="true"
          aria-live="polite"
        >
          <Skeleton className="h-10 w-60 rounded-full mb-10" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </main>
      </>
    );
  }

  const userTokenCount = userBookings.length;
  const canBook =
    Boolean(tokenSettings?.isActive) &&
    tokensLeft > 0 &&
    userTokenCount < MAX_TOKENS_PER_USER;
  const maxCanBook = Math.min(MAX_TOKENS_PER_USER - userTokenCount, tokensLeft);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-50 via-white to-indigo-100">
      <Header />
      <main className="container mx-auto p-6 md:p-10 max-w-4xl">
        <h1
          tabIndex={-1}
          className="text-4xl font-extrabold text-indigo-900 mb-10 font-headline"
          aria-label={`Welcome, ${user.name}!`}
        >
          Welcome, {user.name}!
        </h1>

        <Tabs defaultValue="menu" className="w-full" id="student-dashboard-tabs">
          <TabsList className="grid grid-cols-2 gap-4 mb-8" role="tablist">
            <TabsTrigger value="menu" className="gap-2" role="tab" tabIndex={0}>
              <ChefHat aria-hidden="true" />
              Today's Menu
            </TabsTrigger>
            <TabsTrigger value="booking" className="gap-2" role="tab">
              <Ticket aria-hidden="true" />
              Token Booking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu" role="tabpanel" aria-label="Today's Menu Tab">
            <Card className="shadow-lg rounded-3xl bg-white border border-indigo-200">
              <CardHeader className="px-6 pt-6">
                <CardTitle className="text-3xl font-bold font-headline text-indigo-800 mb-1">Today's Menu</CardTitle>
                <CardDescription className="text-indigo-600 text-lg px-1">
                  Items available in your canteen today.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-8 pt-4">
                <MenuDisplay />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="booking" role="tabpanel" aria-label="Token Booking Tab">
            <Card className="shadow-lg rounded-3xl bg-white border border-indigo-200">
              <CardHeader className="px-6 pt-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 mb-2 md:mb-0">
                  <Ticket className="h-10 w-10 text-indigo-600" aria-hidden="true" />
                  <CardTitle className="text-3xl font-extrabold text-indigo-900 font-headline">
                    Biriyani Token Booking
                  </CardTitle>
                </div>
                <CardDescription className="text-indigo-700 text-lg">
                  Book up to {MAX_TOKENS_PER_USER} tokens for today.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pt-4 pb-8">
                <div
                  className={`rounded-xl p-4 text-center font-semibold mb-5 transition-colors ${
                    tokenSettings?.isActive && tokensLeft > 0
                      ? "bg-green-100 text-green-900"
                      : "bg-red-100 text-red-900"
                  } shadow-inner shadow-green-200`}
                  role="alert"
                  aria-live="assertive"
                >
                  {tokensLeft <= 0
                    ? "Tokens have run out for today."
                    : tokenSettings?.isActive
                    ? "Booking is OPEN. Hurry!"
                    : "Booking is CLOSED at the moment."}
                </div>

                <div className="mb-8 text-center">
                  <p className="text-indigo-700 font-semibold tracking-wide mb-1 text-lg">Tokens Remaining</p>
                  <p
                    className="text-7xl font-extrabold text-yellow-500"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {Math.max(0, tokensLeft)}
                  </p>
                </div>

                {userBookings.length > 0 && (
                  <section
                    aria-label="Your current booked tokens"
                    className="mb-10"
                  >
                    <h2 className="text-indigo-900 font-extrabold mb-4 text-xl">
                      Your Booked Token{userBookings.length > 1 ? "s" : ""}:
                    </h2>

                    <div
                      role="list"
                      className="flex flex-wrap gap-4 justify-center"
                      aria-live="polite"
                    >
                      {userBookings
                        .sort((a, b) => a.tokenNumber - b.tokenNumber)
                        .map(({ id, tokenNumber }) => (
                          <span
                            key={id}
                            role="listitem"
                            className="relative inline-flex items-center space-x-3 bg-green-100 rounded-3xl px-5 py-2 shadow-md border border-green-300 text-green-800 font-semibold text-2xl select-none"
                            aria-label={`Token number ${tokenNumber.toString().padStart(3, "0")}`}
                          >
                            <span aria-hidden="true">#{tokenNumber.toString().padStart(3, "0")}</span>

                            <AlertDialog
                              open={alertOpenId === id}
                              onOpenChange={(open) => setAlertOpenId(open ? id : null)}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:bg-red-200 p-1 rounded-full"
                                  aria-label={`Cancel token number ${tokenNumber.toString().padStart(3, "0")}`}
                                  disabled={cancellingTokenId === id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAlertOpenId(id);
                                  }}
                                >
                                  <X className="h-5 w-5" aria-hidden="true" />
                                </Button>
                              </AlertDialogTrigger>

                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Cancel Token #{tokenNumber.toString().padStart(3, "0")}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this token? You will lose the reserved slot.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setAlertOpenId(null)}>
                                    No, keep it
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCancelBooking(id)}
                                    disabled={cancellingTokenId === id}
                                  >
                                    Yes, Cancel it
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </span>
                        ))}
                    </div>
                  </section>
                )}

                {/* Booking Section */}
                {canBook && (
                  <div className="space-y-6 max-w-md mx-auto">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <label
                        htmlFor="token-select"
                        className="font-bold text-lg whitespace-nowrap"
                      >
                        Select Tokens:
                      </label>
                      <select
                        id="token-select"
                        className="block border border-indigo-400 rounded-lg px-4 py-2 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white"
                        value={tokensToBook}
                        onChange={(e) => setTokensToBook(Number(e.target.value))}
                        disabled={bookingInProgress || maxCanBook <= 0}
                        aria-label="Select number of tokens to book"
                      >
                        {Array.from({ length: maxCanBook }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      size="lg"
                      className="w-full bg-yellow-400 text-yellow-900 font-extrabold py-5 rounded-3xl shadow-lg hover:bg-yellow-500 transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-yellow-500"
                      onClick={handleBookToken}
                      disabled={bookingInProgress || maxCanBook <= 0}
                      aria-busy={bookingInProgress}
                      aria-disabled={bookingInProgress || maxCanBook <= 0}
                    >
                      {bookingInProgress
                        ? "Booking..."
                        : `Book ${tokensToBook} Token${tokensToBook > 1 ? "s" : ""} Now`}
                    </Button>
                  </div>
                )}

                {!canBook && userTokenCount >= MAX_TOKENS_PER_USER && (
                  <div className="text-center bg-yellow-200 text-yellow-800 font-semibold text-lg rounded-lg p-4 shadow-md">
                    You have booked the maximum allowed tokens ({MAX_TOKENS_PER_USER}) for today.
                  </div>
                )}

                {!canBook && tokensLeft <= 0 && userTokenCount < MAX_TOKENS_PER_USER && (
                  <div className="text-center bg-red-200 text-red-800 font-semibold text-lg rounded-lg p-4 shadow-md">
                    Sorry, all tokens for today are booked out.
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