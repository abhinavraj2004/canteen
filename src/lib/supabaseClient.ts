import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SUPABASE ANON KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
