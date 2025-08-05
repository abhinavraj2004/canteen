'use client';

import { useEffect, useState } from 'react';
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
import { PlusCircle, Trash2, Pencil, Settings, Utensils, BookCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

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

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loadingData, setLoadingData] = useState(true);
  const [tokenSettings, setTokenSettings] = useState<TokenSettings | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
  const [resetAmount, setResetAmount] = useState('100');
  const [tokensLeft, setTokensLeft] = useState<number | null>(null);
  const [confirmingUser, setConfirmingUser] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user || user.role !== 'admin') return;

      setLoadingData(true);
      try {
        const { data: tokenData } = await supabase
          .from('token_settings')
          .select('id, is_active, total_tokens, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { data: menu } = await supabase.from('menu_items').select('*');
        setMenuItems(menu ? menu.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          isAvailable: item.is_available,
        })) : []);

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

    if (user) {
      fetchData();
    }
  }, [user, toast]);

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
        tokensLeft: data.total_tokens - bookings.length,
        createdAt: data.created_at,
      });
      setTokensLeft(data.total_tokens - bookings.length);
      toast({ title: 'Settings updated successfully!' });
    }
  };

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

      const todayStr = getTodayDateString();
      await supabase.from('bookings').delete().eq('booking_date', todayStr);

      setBookings([]);
      setTokensLeft(amount);
      setTokenSettings({
        id: data.id,
        isActive: data.is_active,
        totalTokens: data.total_tokens,
        tokensLeft: amount,
        createdAt: data.created_at,
      });

      toast({ title: 'Token bookings have been reset!' });
    } catch (error: any) {
      toast({ title: 'Error resetting tokens', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveMenuItem = async (data: MenuFormValues, id?: string) => {
    const itemData = {
      name: data.name,
      price: data.price,
      category: data.category,
      is_available: data.isAvailable,
    };
    const { error } = id
      ? await supabase.from('menu_items').update(itemData).eq('id', id)
      : await supabase.from('menu_items').insert(itemData);

    if (error) {
      toast({ title: `Error ${id ? 'updating' : 'adding'} menu item`, description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: `Menu item ${id ? 'updated' : 'added'} successfully!` });

    const { data: menu } = await supabase.from('menu_items').select('*');
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
    setMenuItems(prevItems => prevItems.filter(item => item.id !== id));
    toast({ title: 'Menu item deleted.' });
  };

  const handleToggleAvailability = async (id: string, isAvailable: boolean) => {
    const { error } = await supabase.from('menu_items').update({ is_available: isAvailable }).eq('id', id);
    if (error) {
      toast({ title: "Error updating menu availability", description: error.message, variant: "destructive" });
      return;
    }
    setMenuItems(prevItems => prevItems.map(item => item.id === id ? { ...item, isAvailable } : item));
    toast({ title: 'Menu item availability updated.' });
  };

  // Group bookings by userName for grouped display
  const groupedBookings: { [userName: string]: Booking[] } = {};
  bookings.forEach((b) => {
    if (!groupedBookings[b.userName]) groupedBookings[b.userName] = [];
    groupedBookings[b.userName].push(b);
  });

  // Confirm handler for a specific user (confirm all tokens for the user)
  const handleConfirmUserBookings = async (userName: string) => {
    setConfirmingUser(userName);
    const userBookingIds = groupedBookings[userName].filter(b => !b.is_confirmed).map(b => b.id);

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ is_confirmed: true })
        .in('id', userBookingIds);

      if (error) {
        toast({ title: 'Error confirming bookings', description: error.message, variant: 'destructive' });
        return;
      }
      setBookings(prev =>
        prev.map(b =>
          b.userName === userName ? { ...b, is_confirmed: true } : b
        )
      );
      toast({ title: 'All tokens for user confirmed!' });
    } finally {
      setConfirmingUser(null);
    }
  }

  if (authLoading || loadingData || !user) {
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
                    checked={!!tokenSettings?.isActive}
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
                {Object.keys(groupedBookings).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No bookings found for today.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {Object.entries(groupedBookings).map(([name, bookingsArr]) => {
                      const allConfirmed = bookingsArr.every(b => b.is_confirmed);
                      const anyUnconfirmed = bookingsArr.some(b => !b.is_confirmed);
                      return (
                        <div
                          key={name}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2"
                        >
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="font-bold text-lg text-primary">{name}</span>
                            <span className="flex flex-wrap gap-2">
                              {bookingsArr
                                .sort((a, b) => a.tokenNumber - b.tokenNumber)
                                .map(b =>
                                  <span key={b.id} className="inline-flex items-center gap-1 bg-green-50 border border-green-300 px-2 py-1 rounded-lg text-green-800 font-semibold text-base">
                                    #{String(b.tokenNumber).padStart(3, "0")}
                                  </span>
                                )
                              }
                            </span>
                          </div>
                          <div>
                            {allConfirmed ? (
                              <span className="inline-flex items-center gap-1 text-green-700 font-bold">
                                <CheckCircle2 className="w-5 h-5" /> Confirmed
                              </span>
                            ) : anyUnconfirmed ? (
                              <Button
                                size="sm"
                                className="font-bold"
                                variant="outline"
                                disabled={confirmingUser === name}
                                onClick={() => handleConfirmUserBookings(name)}
                              >
                                {confirmingUser === name ? 'Confirming...' : 'Confirm All'}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
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