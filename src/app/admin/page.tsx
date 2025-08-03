'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TokenSettings, MenuItem, Booking } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Pencil, Settings, Utensils, BookCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// Validation schema for Menu Form
const menuFormSchema = z.object({
  name: z.string().min(3, "Name is too short"),
  price: z.coerce.number().positive("Price must be positive"),
  category: z.enum(["Breakfast", "Lunch", "Snacks"]),
  isAvailable: z.boolean().default(true),
});
type MenuFormValues = z.infer<typeof menuFormSchema>;

function MenuForm({ menuItem, onSave }: { menuItem?: MenuItem | null, onSave: (data: MenuFormValues, id?: string) => void }) {
  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: menuItem || { name: "", price: 0, category: "Lunch", isAvailable: true },
  });

  const onSubmit = (data: MenuFormValues) => {
    onSave(data, menuItem?.id);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem>
            <FormLabel>Price (Rs.)</FormLabel>
            <FormControl><Input type="number" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Breakfast">Breakfast</SelectItem>
                <SelectItem value="Lunch">Lunch</SelectItem>
                <SelectItem value="Snacks">Snacks</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField
          control={form.control}
          name="isAvailable"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Available Today</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button type="submit">{menuItem ? 'Save Changes' : 'Add Item'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// Helper to get today's date string in ISO yyyy-mm-dd format
function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  // States for data, UI and forms
  const [loadingData, setLoadingData] = useState(true);
  const [tokenSettings, setTokenSettings] = useState<TokenSettings | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
  const [resetAmount, setResetAmount] = useState('100');
  const [tokensLeft, setTokensLeft] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Load initial data and handle auth guard
  useEffect(() => {
    if (loading) return; // Wait until auth loading finishes

    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    async function fetchData() {
      setLoadingData(true);
      try {
        // Fetch latest token settings
        const { data: tokenData } = await supabase
          .from('token_settings')
          .select('id, is_active, total_tokens, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Fetch all menu items
        const { data: menu } = await supabase.from('menu_items').select('*');
        setMenuItems(menu ? menu.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          isAvailable: item.is_available,
        })) : []);

        // Fetch today's bookings
        const todayStr = getTodayDateString();
        const { data: bookingsData, count: bookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: false })
          .eq('booking_date', todayStr);

        setBookings(bookingsData ? bookingsData.map((b: any) => ({
          id: b.id,
          userId: b.user_id,
          userName: b.user_name,
          tokenNumber: b.token_number,
          bookingDate: b.booking_date,
          createdAt: b.created_at,
          is_confirmed: b.is_confirmed || false,
        })) : []);

        // Calculate tokens left dynamically
        if (tokenData && typeof bookingsCount === 'number') {
          setTokensLeft(tokenData.total_tokens - bookingsCount);
        } else if (tokenData) {
          setTokensLeft(tokenData.total_tokens);
        } else {
          setTokensLeft(null);
        }

        setTokenSettings(tokenData ? {
          id: tokenData.id,
          isActive: tokenData.is_active,
          totalTokens: tokenData.total_tokens,
          tokensLeft: tokenData.total_tokens - (bookingsCount || 0),
          createdAt: tokenData.created_at,
        } : null);

        if (tokenData) setResetAmount(String(tokenData.total_tokens));

      } catch (error: any) {
        toast({ title: 'Error loading data', description: error.message, variant: 'destructive' });
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [user, router, loading, toast]);

  // Update token settings handler
  const handleUpdateTokenSettings = async () => {
    if (!tokenSettings) return;
    const { data, error } = await supabase
      .from('token_settings')
      .update({
        is_active: tokenSettings.isActive,
        total_tokens: tokenSettings.totalTokens,
      })
      .eq('id', tokenSettings.id)
      .select()
      .single();
    if (error) {
      toast({ title: 'Error updating settings', description: error.message, variant: 'destructive' });
    } else {
      setTokenSettings({
        id: data.id,
        isActive: data.is_active,
        totalTokens: data.total_tokens,
        tokensLeft: data.total_tokens,
        createdAt: data.created_at,
      });
      toast({ title: 'Settings updated successfully!' });
    }
  };

  // Reset tokens handler
  const handleResetTokens = async () => {
    const amount = parseInt(resetAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a positive number for total tokens.', variant: 'destructive' });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('token_settings')
        .insert({ is_active: true, total_tokens: amount })
        .select()
        .single();

      if (error) {
        toast({ title: 'Error resetting tokens', description: error.message, variant: 'destructive' });
        return;
      }

      // Delete all bookings for today
      const todayStr = getTodayDateString();
      await supabase.from('bookings').delete().eq('booking_date', todayStr);

      setBookings([]);
      setTokensLeft(amount);
      setTokenSettings({
        id: data.id,
        isActive: data.is_active,
        totalTokens: data.total_tokens,
        tokensLeft: data.total_tokens,
        createdAt: data.created_at,
      });

      toast({ title: 'Token bookings have been reset!' });
    } catch (error: any) {
      toast({ title: 'Error resetting tokens', description: error.message, variant: 'destructive' });
    }
  };

  // Save new or updated menu item
  const handleSaveMenuItem = async (data: MenuFormValues, id?: string) => {
    if (id) {
      // Update existing item
      const { error } = await supabase.from('menu_items').update({
        name: data.name,
        price: data.price,
        category: data.category,
        is_available: data.isAvailable,
      }).eq('id', id);
      if (error) {
        toast({ title: "Error updating menu item", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Menu item updated successfully!" });
    } else {
      // Insert new item
      const { error } = await supabase.from('menu_items').insert({
        name: data.name,
        price: data.price,
        category: data.category,
        is_available: data.isAvailable,
      });
      if (error) {
        toast({ title: "Error adding menu item", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Menu item added successfully!" });
    }
    // Refresh menu list after changes
    const { data: menu, error: fetchError } = await supabase.from('menu_items').select('*');
    if (fetchError) {
      toast({ title: "Error fetching menu", description: fetchError.message, variant: "destructive" });
      return;
    }
    setMenuItems(menu ? menu.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      isAvailable: item.is_available,
    })) : []);
    setIsMenuFormOpen(false);
    setEditingMenuItem(null);
  };

  const handleDeleteMenuItem = async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) {
      toast({ title: "Error deleting menu item", description: error.message, variant: "destructive" });
      return;
    }
    const { data: menu, error: fetchError } = await supabase.from('menu_items').select('*');
    if (fetchError) {
      toast({ title: "Error fetching menu", description: fetchError.message, variant: "destructive" });
      return;
    }
    setMenuItems(menu ? menu.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      isAvailable: item.is_available,
    })) : []);
    toast({ title: 'Menu item deleted.' });
  };

  // Toggle item availability
  const handleToggleAvailability = async (id: string, isAvailable: boolean) => {
    const { error } = await supabase.from('menu_items').update({ is_available: isAvailable }).eq('id', id);
    if (error) {
      toast({ title: "Error updating menu availability", description: error.message, variant: "destructive" });
      return;
    }
    const { data: menu, error: fetchError } = await supabase.from('menu_items').select('*');
    if (fetchError) {
      toast({ title: "Error fetching menu", description: fetchError.message, variant: "destructive" });
      return;
    }
    setMenuItems(menu ? menu.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      isAvailable: item.is_available,
    })) : []);
    toast({ title: 'Menu item availability updated.' });
  };

  // Confirm booking handler
  const handleConfirmBooking = async (bookingId: string) => {
    setConfirmingId(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ is_confirmed: true })
        .eq('id', bookingId);
      if (error) {
        toast({ title: 'Error confirming booking', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Booking confirmed!' });

      // Refresh bookings list
      const todayStr = getTodayDateString();
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_date', todayStr);

      setBookings(bookingsData ? bookingsData.map((b: any) => ({
        id: b.id,
        userId: b.user_id,
        userName: b.user_name,
        tokenNumber: b.token_number,
        bookingDate: b.booking_date,
        createdAt: b.created_at,
        is_confirmed: b.is_confirmed || false,
      })) : []);
    } finally {
      setConfirmingId(null);
    }
  }

  if (loading || loadingData || !user) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-4 md:p-8">
          <Skeleton className="h-8 w-1/2 mb-8" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </>
    );
  }

  const sortedMenuItems = [...menuItems].sort((a, b) => {
    const categoryOrder = { Breakfast: 0, Lunch: 1, Snacks: 2 };
    return categoryOrder[a.category] - categoryOrder[b.category];
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 font-headline">Admin Dashboard</h1>

        <Tabs defaultValue="menu" className="w-full">
          <TabsList className="grid w-full grid-cols-1 h-auto md:grid-cols-3 md:h-10">
            <TabsTrigger value="menu" className="gap-2"><Utensils /> Menu Management</TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2"><BookCheck />Today's Bookings</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings /> Token Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Token Settings</CardTitle>
                <CardDescription>Control the token booking system.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                  <Label htmlFor="booking-active" className="font-bold text-lg">Booking Active</Label>
                  <Switch
                    id="booking-active"
                    checked={tokenSettings?.isActive}
                    onCheckedChange={(checked) => setTokenSettings(s => s ? {...s, isActive: checked} : null)}
                  />
                </div>
                <div className="space-y-2 p-4 border rounded-lg">
                  <Label htmlFor="total-tokens" className="font-bold text-lg">Total Tokens</Label>
                  <p className="text-sm text-muted-foreground">This number is set when you reset the bookings for the day.</p>
                  <Input id="total-tokens" type="number" value={tokenSettings?.totalTokens || 0} disabled />
                </div>
                <div className="text-center text-lg p-4 border rounded-lg">
                  <p className="text-muted-foreground">Tokens Left</p>
                  <p className="font-bold text-4xl text-primary">{tokensLeft !== null ? tokensLeft : 0}</p>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 flex-col sm:flex-row gap-4">
                <Button onClick={handleUpdateTokenSettings} className="w-full sm:w-auto">Save Settings</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="destructive" className="w-full sm:w-auto">Reset Tokens</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete all existing bookings and reset the token count for a new day. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                      <Label htmlFor="reset-amount">Number of Tokens for Today</Label>
                      <Input id="reset-amount" type="number" value={resetAmount} onChange={(e) => setResetAmount(e.target.value)} />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetTokens}>Yes, Reset Bookings</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="menu">
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Menu Management</CardTitle>
                  <CardDescription>Add, edit, or toggle daily availability of items.</CardDescription>
                </div>
                <Dialog open={isMenuFormOpen} onOpenChange={setIsMenuFormOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingMenuItem(null); setIsMenuFormOpen(true); }} className="gap-2"><PlusCircle /> Add Item</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingMenuItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
                    </DialogHeader>
                    <MenuForm menuItem={editingMenuItem} onSave={handleSaveMenuItem} />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {/* Large screens */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Available Today</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMenuItems.map((item) => (
                        <TableRow key={item.id} className={!item.isAvailable ? 'bg-muted/50' : ''}>
                          <TableCell>
                            <Switch checked={item.isAvailable} onCheckedChange={(checked) => handleToggleAvailability(item.id, checked)} />
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>Rs.{item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingMenuItem(item); setIsMenuFormOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteMenuItem(item.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Small screens */}
                <div className="md:hidden space-y-4">
                  {sortedMenuItems.map((item) => (
                    <Card key={item.id} className={`w-full ${!item.isAvailable ? 'bg-muted/50' : ''}`}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{item.name}</CardTitle>
                            <CardDescription>{item.category}</CardDescription>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`avail-${item.id}`} className="text-sm">Available</Label>
                            <Switch id={`avail-${item.id}`} checked={item.isAvailable} onCheckedChange={(checked) => handleToggleAvailability(item.id, checked)} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-bold">Rs.{item.price.toFixed(2)}</p>
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingMenuItem(item); setIsMenuFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteMenuItem(item.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                {sortedMenuItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No menu items found. Add one to get started.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Today's Bookings</CardTitle>
                <CardDescription>All tokens booked for the special Biriyani today.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token No.</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Confirm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-bold text-lg text-primary">{String(booking.tokenNumber).padStart(3, '0')}</TableCell>
                        <TableCell>{booking.userName}</TableCell>
                        <TableCell>
                          {booking.is_confirmed ? (
                            <span className="text-green-600 font-semibold">Confirmed</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConfirmBooking(booking.id)}
                              disabled={confirmingId === booking.id}
                            >
                              {confirmingId === booking.id ? 'Confirming...' : 'Confirm'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {bookings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No bookings have been made yet today.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
