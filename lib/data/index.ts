import { localProvider } from "./localProvider";
import { supabaseProvider } from "./supabaseProvider";
import type { DataProvider } from "./types";

/**
 * Returns the Supabase/PostGIS provider when credentials are configured,
 * otherwise falls back to the fully offline in-memory provider. This lets
 * `npm run dev` work immediately with zero external setup, while still
 * using the real PostGIS RPCs once a Supabase project is wired up.
 */
export function getProvider(): DataProvider {
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return hasSupabase ? supabaseProvider : localProvider;
}

export type { DataProvider } from "./types";
