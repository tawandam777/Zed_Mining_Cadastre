import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser/client-side Supabase client — anon key, RLS-restricted to read-only. */
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
