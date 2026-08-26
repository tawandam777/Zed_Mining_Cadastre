"use client";

import { useEffect, useState } from "react";
import type { LicenceFeatureCollection } from "./types";

let cachedPromise: Promise<LicenceFeatureCollection> | null = null;

function fetchLicences(): Promise<LicenceFeatureCollection> {
  if (!cachedPromise) {
    cachedPromise = fetch("/api/licences", { cache: "no-store" }).then((r) => r.json());
  }
  return cachedPromise;
}

/** All licences, fetched once (module-level cache) and shared across every component that needs the full v1 dataset. */
export function useLicences() {
  const [data, setData] = useState<LicenceFeatureCollection | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLicences()
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
