'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { TokenSettings, Booking, MenuItem } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { Ticket, PartyPopper, Utensils, Sandwich, Cookie, ChefHat } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categoryIcons: { [key: string]: React.ReactNode } = {
  'Breakfast': <Sandwich className="h-6 w-6 text-primary" />,
  'Lunch': <Utensils className="h-6 w-6 text-primary" />,
  'Snacks': <Cookie className="h-6 w-6 text-primary" />,
};

function MenuDisplay() {
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
  const [userBooking, setUserBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Helper: Fetch Token Settings from Supabase
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
    };
  };

  // Helper: Fetch User Booking from Supabase
  const fetchUserBooking = async (userId: string): Promise<Booking | null> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .eq('booking_date', today.toISOString().slice(0, 10))
      .single();
    if (!data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      tokenNumber: data.token_number,
      bookingDate: data.booking_date,
      createdAt: data.created_at,
    };
  };

  // Helper: Book Token
  const supabaseBookToken = async (user: any) => {
    // 1. Check token_settings
    const tokenSettings = await fetchTokenSettings();
    if (!tokenSettings?.isActive) {
      return { success: false, message: "Booking is closed." };
    }
    if (tokenSettings.tokensLeft <= 0) {
      return { success: false, message: "No tokens left." };
    }
    // 2. Check if user already booked
    const alreadyBooked = await fetchUserBooking(user.id);
    if (alreadyBooked) {
      return { success: false, message: "You have already booked a token." };
    }
    // 3. Get next token number
    const { data: bookings, error: bookingErr } = await supabase
      .from('bookings')
      .select('token_number')
      .eq('booking_date', new Date().toISOString().slice(0, 10))
      .order('token_number', { ascending: false })
      .limit(1);

    const nextTokenNumber = bookings && bookings.length > 0 ? bookings[0].token_number + 1 : 1;

    // 4. Insert booking
    const { error: insertErr, data: bookingData } = await supabase
      .from('bookings')
      .insert([{
        user_id: user.id,
        user_name: user.name || user.email,
        token_number: nextTokenNumber,
        booking_date: new Date().toISOString().slice(0, 10),
      }])
      .select()
      .single();

    if (insertErr || !bookingData) {
      return { success: false, message: "Failed to book token. Please try again." };
    }

    // 5. Decrement tokens_left
    await supabase
      .from('token_settings')
      .update({ tokens_left: tokenSettings.tokensLeft - 1 })
      .eq('id', (tokenSettings as any).id);

    return {
      success: true,
      message: `Your token is booked! Token Number: ${nextTokenNumber}`,
      tokenNumber: nextTokenNumber,
    };
  };

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
      const [settings, booking] = await Promise.all([
        fetchTokenSettings(),
        fetchUserBooking(user.id),
      ]);
      setTokenSettings(settings);
      setUserBooking(booking);
      setLoading(false);
    };

    fetchData();
    // eslint-disable-next-line
  }, [user, router]);

  const handleBookToken = async () => {
    if (!user) return;
    setBookingInProgress(true);
    const result = await supabaseBookToken(user);
    if (result.success && result.tokenNumber) {
      toast({
        title: "Success!",
        description: result.message,
      });
      // Immediately update booking state for instant feedback
      const booking = await fetchUserBooking(user.id);
      setUserBooking(booking);
      // Refresh token count from server
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

  const canBook = tokenSettings?.isActive && (tokenSettings.tokensLeft > 0) && !userBooking;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 font-headline">Welcome, {user.name}!</h1>

        {userBooking ? (
          <Card className="shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 w-full max-w-lg mx-auto mb-8">
              <CardHeader>
                  <CardTitle className="flex items-center gap-3 font-headline text-2xl text-green-800">
                      <PartyPopper className="h-8 w-8" />
                      Your Token is Confirmed!
                  </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                  <p className="text-muted-foreground text-sm sm:text-base">Show this at the counter to collect your order.</p>
                  <p className="text-8xl font-bold my-4 text-green-600 drop-shadow-lg">{String(userBooking.tokenNumber).padStart(3, '0')}</p>
                  <p className="text-muted-foreground">Booking Date: {new Date(userBooking.bookingDate).toLocaleDateString()}</p>
              </CardContent>
          </Card>
        ) : null}

        <Tabs defaultValue="menu" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="menu" className="gap-2"><ChefHat /> Today's Menu</TabsTrigger>
            <TabsTrigger value="booking" className="gap-2" disabled={!!userBooking}><Ticket /> Token Booking</TabsTrigger>
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
            {!userBooking ? (
                <Card className="shadow-lg mt-4">
                    <CardHeader>
                    <CardTitle className="flex items-center gap-3 font-headline text-2xl">
                        <Ticket className="text-primary h-8 w-8" />
                        Biriyani Token Booking
                    </CardTitle>
                    <CardDescription>Book your special Biriyani token for today.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                          <div className={`p-4 rounded-md text-center font-bold text-lg ${tokenSettings?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {tokenSettings?.isActive ? "Booking is LIVE!" : "Booking is CLOSED"}
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Tokens Remaining</p>
                            <p className="text-5xl font-bold text-primary">{tokenSettings?.tokensLeft}</p>
                          </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            size="lg" 
                            className="w-full text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground" 
                            onClick={handleBookToken}
                            disabled={!canBook || bookingInProgress}
                        >
                            {bookingInProgress ? "Booking..." : "Book My Token Now"}
                        </Button>
                    </CardFooter>
                </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}