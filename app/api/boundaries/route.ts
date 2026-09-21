import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data";

// Route Handlers are NOT cached by default in Next.js (unlike pages under 'auto'), regardless
// of whether they touch dynamic data — see node_modules/next/dist/docs/01-app/01-getting-started/
// 15-route-handlers.md's Caching section. Without this, every single page load re-invokes the
// serverless function and re-transfers the full ~4MB boundary payload from scratch, even though
// the underlying data (lib/data/boundaries.generated.json) never changes except on redeploy —
// that per-request cold cost, not payload size, is what was still making this slow after the
// payload-size fix. force-static + revalidate lets Vercel's edge cache serve repeat requests
// directly with zero function re-invocation; revalidate bounds staleness to an hour in case a
// future supabaseProvider-backed boundaries table changes without a redeploy.
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  try {
    const geojson = await getProvider().getBoundariesGeoJSON();
    // force-static's auto-generated header only sets s-maxage (shared/CDN caches) — browsers
    // ignore that for their own private cache, so without an explicit max-age here every page
    // load still pays a full network round-trip to the edge even on a warm cache. Setting it
    // explicitly lets the browser itself skip the network entirely on repeat loads within the
    // hour (paired with dropping `cache: "no-store"` on the client fetch in useBoundaries.ts).
    return NextResponse.json(geojson, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
