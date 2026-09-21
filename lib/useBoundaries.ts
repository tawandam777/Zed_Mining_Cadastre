"use client";

import { useEffect, useState } from "react";
import type { AdminBoundariesGeoJSON } from "./data/types";

let cachedPromise: Promise<AdminBoundariesGeoJSON> | null = null;

function fetchBoundaries(): Promise<AdminBoundariesGeoJSON> {
  if (!cachedPromise) {
    // No explicit `cache` option (was `no-store`, a leftover from when this endpoint parsed
    // shapefiles per-request and any caching risked serving a stale/broken response during that
    // instability): the endpoint is now a pre-generated static response with real Cache-Control
    // headers (route.ts), so the default fetch behavior lets the browser skip the network
    // entirely on repeat loads within that window instead of forcing a full round-trip every time.
    cachedPromise = fetch("/api/boundaries").then((r) => r.json());
  }
  return cachedPromise;
}

/**
 * National/province/district boundaries, fetched once (module-level cache) and shared by
 * every component that needs them — mirrors useLicences.ts. This is also what AppShell's
 * loading overlay waits on, not just the (much faster) licence fetch — otherwise the overlay
 * clears before boundaries are actually ready and it looks like the boundary layers are
 * broken rather than just still loading.
 */
export function useBoundaries() {
  const [data, setData] = useState<AdminBoundariesGeoJSON | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBoundaries()
      .then((geojson) => {
        if (!cancelled) setData(geojson);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
