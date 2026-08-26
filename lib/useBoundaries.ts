"use client";

import { useEffect, useState } from "react";
import type { AdminBoundariesGeoJSON } from "./data/types";

let cachedPromise: Promise<AdminBoundariesGeoJSON> | null = null;

function fetchBoundaries(): Promise<AdminBoundariesGeoJSON> {
  if (!cachedPromise) {
    cachedPromise = fetch("/api/boundaries", { cache: "no-store" }).then((r) => r.json());
  }
  return cachedPromise;
}

/**
 * National/province/district boundaries, fetched once (module-level cache) and shared by
 * every component that needs them — mirrors useLicences.ts. Reading real shapefiles
 * (including a 12.8MB district file) on the server takes over a second even locally, so
 * this is also what AppShell's loading overlay waits on, not just the (much faster) licence
 * fetch — otherwise the overlay clears before boundaries are actually ready and it looks
 * like the boundary layers are broken rather than just still loading.
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
