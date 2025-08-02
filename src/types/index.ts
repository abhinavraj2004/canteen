export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'Breakfast' | 'Lunch' | 'Snacks';
  isAvailable: boolean;
}

export interface TokenSettings {
  isActive: boolean;
  totalTokens: number;
  tokensLeft: number;
  createdAt?: string;
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  tokenNumber: number;
  bookingDate: string; // <-- string, not Date!
  createdAt?: string;
}

export interface Feedback {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  date: string; // <-- string, not Date!
}