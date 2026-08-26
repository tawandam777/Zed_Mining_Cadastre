import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Server-side Supabase client for Route Handlers — still anon key, RLS-restricted read-only. */
export function supabaseServer() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
