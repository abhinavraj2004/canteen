// src/types/index.ts

// User row/profile (used for both auth and profiles table)
export interface User {
  id: string;            // Supabase Auth/User ID (UUID as string)
  name: string;
  email: string;
  role: 'student' | 'admin';
  isEmailConfirmed?: boolean;
}

// Menu item for 'menu_items' table
export interface MenuItem {
  id: string;                                // UUID or string
  name: string;
  price: number;
  category: 'Breakfast' | 'Lunch' | 'Snacks';
  isAvailable: boolean;
  createdAt?: string;                        // ISO string, e.g. 2024-07-12T09:34:12Z
}

// Daily biriyani/other token booking settings
export interface TokenSettings {
  id: string;           // UUID/string for this row (supabase returns id as string)
  isActive: boolean;    // Whether booking is currently open
  totalTokens: number;
  tokensLeft?: number;  // Optional, you may compute tokensLeft = totalTokens - bookings today
  createdAt?: string;   // ISO date string, Supabase `created_at`
}

// Token booking (row of 'bookings' table)
export interface Booking {
  id: string;                 // UUID/string (supabase returns string)
  userId: string;             // Who booked this token
  userName: string;           // Name or email at time of booking
  tokenNumber: number;        // The token value, e.g. 1, 2, ...
  bookingDate: string;        // Only store as "YYYY-MM-DD" string
  createdAt?: string;         // ISO string
  is_confirmed?: boolean;     // Optionally, if you use per-token confirmation
}

// Feedback (row of feedback table)
export interface Feedback {
  id: string;                 // UUID
  userId: string;
  rating: number;             // 1-5 or 1-10, as decided
  comment: string;
  date: string;               // ISO date string, e.g. 2024-08-03
}

