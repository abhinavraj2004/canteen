'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/header';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { TokenSettings, MenuItem, Booking } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Pencil, Settings, Utensils, BookCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';


// === MenuForm Schema and Component ===
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
            <FormControl><Input {...field} placeholder="Menu item name" autoComplete="off" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-4 flex-col sm:flex-row">
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem className="flex-1 min-w-0">
              <FormLabel>Price (Rs.)</FormLabel>
              <FormControl><Input type="number" min={0} step={0.01} {...field} autoComplete="off" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem className="flex-1 min-w-0">
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
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
        </div>
        <FormField
          control={form.control}
          name="isAvailable"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-2">
              <FormLabel className="font-medium text-primary cursor-pointer">Available Today</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <DialogFooter className="flex gap-4 justify-end pt-4">
          <DialogClose asChild>
            <Button variant="ghost" type="button">Cancel</Button>
          </DialogClose>
          <Button type="submit" variant="default">
            {menuItem ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}


// === MAIN COMPONENT ===
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
  const [addTokensAmount, setAddTokensAmount] = useState('');
  const [addingTokens, setAddingTokens] = useState(false);

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

  // Handlers remain unchanged as per your original code

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

  const handleAddMoreTokens = async () => {
    if (!tokenSettings) return;
    const addAmount = parseInt(addTokensAmount, 10);
    if (isNaN(addAmount) || addAmount <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a positive number to add.', variant: 'destructive' });
      return;
    }
    setAddingTokens(true);
    try {
      const { data, error } = await supabase
        .from('token_settings')
        .update({
          total_tokens: tokenSettings.totalTokens + addAmount,
        })
        .eq('id', tokenSettings.id)
        .select()
        .single();

      if (error) {
        toast({ title: 'Error adding tokens', description: error.message, variant: 'destructive' });
        setAddingTokens(false);
        return;
      }

      setTokenSettings({
        ...tokenSettings,
        totalTokens: data.total_tokens,
        tokensLeft: data.total_tokens - bookings.length,
      });
      setTokensLeft(data.total_tokens - bookings.length);
      setResetAmount(String(data.total_tokens));
      setAddTokensAmount('');
      toast({ title: `Added ${addAmount} tokens successfully!` });
    } catch (error: any) {
      toast({ title: 'Error adding tokens', description: error.message, variant: 'destructive' });
    }
    setAddingTokens(false);
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

  const groupedBookings: { [userName: string]: Booking[] } = {};
  bookings.forEach((b) => {
    if (!groupedBookings[b.userName]) groupedBookings[b.userName] = [];
    groupedBookings[b.userName].push(b);
  });

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
  };

  if (authLoading || loadingData || !user) {
    return (
      <>
        <Header />
        <div className="flex flex-col justify-center items-center min-h-screen w-full bg-gradient-to-br from-blue-50 to-slate-100 px-4">
          <Skeleton className="h-10 w-48 rounded-full mb-8" />
          <div className="w-full max-w-md flex flex-col gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl w-full" />
            ))}
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
    <div className="bg-gradient-to-br from-blue-50 to-slate-100 min-h-screen">
      <Header />
      <main className="container mx-auto max-w-5xl pb-20 px-4 sm:px-6 md:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-8 mt-6 text-primary font-headline drop-shadow-sm">
          Admin Dashboard
        </h1>
        <Tabs defaultValue="menu" className="w-full">
          <TabsList className="w-full bg-white rounded-xl shadow-sm flex gap-3 md:gap-6 mx-auto py-3 sticky top-[72px] z-40 px-4 md:px-6">
            <TabsTrigger value="menu" className="flex-1 flex gap-2 items-center justify-center text-lg px-0 py-1 font-semibold rounded-lg hover:bg-blue-100/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200">
              <Utensils className="w-5 h-5" /> Menu
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1 flex gap-2 items-center justify-center text-lg px-0 py-1 font-semibold rounded-lg hover:bg-blue-100/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200">
              <BookCheck className="w-5 h-5" /> Bookings
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 flex gap-2 items-center justify-center text-lg px-0 py-1 font-semibold rounded-lg hover:bg-blue-100/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200">
              <Settings className="w-5 h-5" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="pt-6">
            <Card className="shadow-xl rounded-2xl border-blue-100 bg-white/90">
              <CardHeader className="pb-3 px-6">
                <CardTitle className="text-xl font-bold">Token Settings</CardTitle>
                <CardDescription className="text-base">Control token booking for today.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 py-6 px-6">
                <div className="flex items-center justify-between px-6 py-4 border rounded-lg bg-gray-50 shadow-sm">
                  <Label htmlFor="booking-active" className="font-bold text-lg cursor-pointer">Booking Active</Label>
                  <Switch
                    id="booking-active"
                    checked={!!tokenSettings?.isActive}
                    onCheckedChange={checked =>
                      setTokenSettings(s => (s ? { ...s, isActive: checked } : null))
                    }
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="p-4 border rounded-lg bg-gray-50 shadow-sm">
                    <Label htmlFor="total-tokens" className="font-bold text-lg">
                      Total Tokens
                    </Label>
                    <Input
                      id="total-tokens"
                      type="number"
                      value={tokenSettings?.totalTokens || 0}
                      className="mt-2 font-mono"
                      disabled
                    />
                    <p className="text-xs mt-1 text-muted-foreground">
                      Set at booking reset or add more.
                    </p>
                    {/* Add More Tokens Section */}
                    <div className="flex items-center gap-2 mt-4">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Add tokens"
                        value={addTokensAmount}
                        onChange={e => setAddTokensAmount(e.target.value)}
                        className="w-28"
                        disabled={addingTokens}
                        aria-label="Add tokens"
                      />
                      <Button
                        onClick={handleAddMoreTokens}
                        className="font-semibold min-w-[90px]"
                        disabled={addingTokens || !addTokensAmount}
                        aria-disabled={addingTokens || !addTokensAmount}
                      >
                        {addingTokens ? 'Adding...' : 'Add More'}
                      </Button>
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Add more tokens to today's total <br /> without resetting bookings.
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-gray-50 shadow-sm">
                    <p className="text-lg text-muted-foreground">Tokens Left</p>
                    <p className="font-bold text-4xl text-primary mt-2 select-all">
                      {tokensLeft !== null ? tokensLeft : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t p-6 pt-4 flex flex-col md:flex-row gap-4 md:justify-between">
                <Button onClick={handleUpdateTokenSettings} className="w-full md:w-auto font-semibold tracking-wider shadow-none">
                  Save Settings
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full md:w-auto font-semibold shadow-none">
                      Reset Tokens
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset All Bookings?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will <b>erase all bookings</b> for today and set a new token count.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                      <Label htmlFor="reset-amount" className="block mb-1">Tokens for Today</Label>
                      <Input
                        id="reset-amount"
                        type="number"
                        min={1}
                        value={resetAmount}
                        onChange={e => setResetAmount(e.target.value)}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetTokens}>Reset</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* MENU TAB */}
          <TabsContent value="menu" className="pt-6">
            <Card className="shadow-xl rounded-2xl border-blue-100 bg-white/90">
              <CardHeader className="flex items-center justify-between px-6 pb-2">
                <div>
                  <CardTitle>Manage Menu</CardTitle>
                  <CardDescription>Add, edit, or set availability for menu items.</CardDescription>
                </div>
                <Dialog open={isMenuFormOpen} onOpenChange={setIsMenuFormOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="default"
                      className="gap-2 rounded-lg font-semibold"
                      onClick={() => {
                        setEditingMenuItem(null);
                        setIsMenuFormOpen(true);
                      }}
                    >
                      <PlusCircle /> Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}
                      </DialogTitle>
                    </DialogHeader>
                    <MenuForm
                      menuItem={editingMenuItem}
                      onSave={handleSaveMenuItem}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="px-0 md:px-6">
                {/* DESKTOP TABLE */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Available</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMenuItems.map(item => (
                        <TableRow key={item.id} className={!item.isAvailable ? 'bg-muted/50' : ''}>
                          <TableCell>
                            <Switch
                              checked={item.isAvailable}
                              onCheckedChange={checked =>
                                handleToggleAvailability(item.id, checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>Rs.{item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="rounded-full"
                              onClick={() => {
                                setEditingMenuItem(item);
                                setIsMenuFormOpen(true);
                              }}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full" title="Delete">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete <span className="font-bold">{item.name}</span>?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteMenuItem(item.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* MOBILE CARDS */}
                <div className="md:hidden space-y-4">
                  {sortedMenuItems.map(item => (
                    <Card
                      key={item.id}
                      className={`w-full shadow border ${!item.isAvailable ? 'bg-muted/40 border-muted' : 'border-blue-200/60'}`}
                    >
                      <CardHeader className="flex justify-between items-center px-4 py-3">
                        <div>
                          <CardTitle className="truncate">{item.name}</CardTitle>
                          <CardDescription className="text-xs">{item.category}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`avail-${item.id}`} className="text-xs font-medium text-muted-foreground cursor-pointer">Available</Label>
                          <Switch
                            id={`avail-${item.id}`}
                            checked={item.isAvailable}
                            onCheckedChange={checked => handleToggleAvailability(item.id, checked)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pt-0 pb-2">
                        <span className="text-2xl font-bold block mb-2">
                          Rs.{item.price.toFixed(2)}
                        </span>
                      </CardContent>
                      <CardFooter className="flex gap-2 justify-end px-4 pb-4 pt-0">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="rounded-full"
                          onClick={() => {
                            setEditingMenuItem(item);
                            setIsMenuFormOpen(true);
                          }}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full" title="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete <span className="font-bold">{item.name}</span>?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteMenuItem(item.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    </Card>
                  ))}
                  {sortedMenuItems.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">No menu items yet. Add one to get started.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings" className="pt-6">
            <Card className="shadow-xl rounded-2xl border-blue-100 bg-white/90">
              <CardHeader className="px-6 pb-2">
                <CardTitle>Today's Bookings</CardTitle>
                <CardDescription>
                  All tokens booked today, grouped by user.
                </CardDescription>
              </CardHeader>
              <CardContent className="py-5 px-6">
                {Object.keys(groupedBookings).length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">No bookings for today.</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {Object.entries(groupedBookings).map(([name, bookingsArr]) => {
                      const allConfirmed = bookingsArr.every(b => b.is_confirmed);
                      const anyUnconfirmed = bookingsArr.some(b => !b.is_confirmed);
                      return (
                        <div
                          key={name}
                          className="flex flex-col md:flex-row md:items-center md:justify-between border rounded-lg p-4 gap-2 md:gap-6 bg-white/50"
                        >
                          <div className="flex flex-wrap items-center gap-4">
                            <span className="font-bold text-lg text-primary">{name}</span>
                            <span className="flex flex-wrap gap-3">
                              {bookingsArr
                                .sort((a, b) => a.tokenNumber - b.tokenNumber)
                                .map(b => (
                                  <span
                                    key={b.id}
                                    className="inline-flex items-center gap-1 bg-green-50 border border-green-300 px-3 py-1 rounded-full text-green-700 font-semibold text-base"
                                  >
                                    #{String(b.tokenNumber).padStart(3, '0')}
                                  </span>
                                ))}
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
                                variant="outline"
                                disabled={confirmingUser === name}
                                onClick={() => handleConfirmUserBookings(name)}
                                className="font-bold mt-2 md:mt-0"
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
