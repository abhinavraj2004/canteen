import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or anonymous key is missing. Please check your .env file or environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// These console.logs are helpful for local debugging but can be removed for production.
// console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
// console.log("SUPABASE ANON KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);