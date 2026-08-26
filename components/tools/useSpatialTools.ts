"use client";

import * as turf from "@turf/turf";
import { useMapStore, type LonLat } from "@/store/useMapStore";
import type { LicenceFeatureCollection } from "@/lib/types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Client-side polygon selection against the already-loaded licence dataset (v1 loads the full ~55-row set once). */
async function selectByPolygon(ring: LonLat[]): Promise<string[]> {
  const res = await fetch("/api/licences", { cache: "no-store" });
  const geojson = (await res.json()) as LicenceFeatureCollection;
  const closed = ring.length >= 3 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
    ? [...ring, ring[0]]
    : ring;
  const poly = turf.polygon([closed]);
  return geojson.features
    .filter((f) => turf.booleanPointInPolygon(turf.centroid(f as turf.AllGeoJSON), poly))
    .map((f) => f.properties.id);
}

/**
 * The map's `singleclick`/`dblclick` listeners are registered once (inside
 * MapCanvas's mount-only effect) and never re-subscribed, so the handlers
 * returned here must not close over reactive `useMapStore((s) => s.x)`
 * values — those would freeze at whatever they were on first mount. Every
 * gating value is instead read fresh via `useMapStore.getState()` at call
 * time; only the (identity-stable) store actions are taken from the hook.
 */
export function useSpatialTools() {
  const addToolPoint = useMapStore((s) => s.addToolPoint);
  const setBufferCenter = useMapStore((s) => s.setBufferCenter);
  const setToolSelectionIds = useMapStore((s) => s.setToolSelectionIds);
  const setToolFrozen = useMapStore((s) => s.setToolFrozen);

  async function runBufferQuery(center: LonLat, radiusKm: number) {
    const { licences } = await postJson<{ licences: { id: string }[] }>("/api/query/buffer", {
      lon: center[0],
      lat: center[1],
      radiusKm,
    });
    setToolSelectionIds(licences.map((l) => l.id));
  }

  async function finishRectSelect(a: LonLat, b: LonLat) {
    const xmin = Math.min(a[0], b[0]);
    const xmax = Math.max(a[0], b[0]);
    const ymin = Math.min(a[1], b[1]);
    const ymax = Math.max(a[1], b[1]);
    const { licences } = await postJson<{ licences: { id: string }[] }>("/api/query/bbox", { xmin, ymin, xmax, ymax });
    setToolSelectionIds(licences.map((l) => l.id));
    setToolFrozen(true);
  }

  async function finishCircleSelect(center: LonLat, edge: LonLat) {
    const radiusKm = turf.distance(turf.point(center), turf.point(edge), { units: "kilometers" });
    const { licences } = await postJson<{ licences: { id: string }[] }>("/api/query/within", {
      lon: center[0],
      lat: center[1],
      meters: radiusKm * 1000,
    });
    setToolSelectionIds(licences.map((l) => l.id));
    setToolFrozen(true);
  }

  async function finishPolygonSelect(points: LonLat[]) {
    const ids = await selectByPolygon(points);
    setToolSelectionIds(ids);
    setToolFrozen(true);
  }

  function handleMapClick(pt: LonLat) {
    const { activeTool, toolFrozen, toolPoints, bufferRadiusKm } = useMapStore.getState();
    if (!activeTool || toolFrozen) return;
    if (activeTool === "measureDistance" || activeTool === "measureArea") {
      addToolPoint(pt);
    } else if (activeTool === "buffer") {
      setBufferCenter(pt);
      void runBufferQuery(pt, bufferRadiusKm);
    } else if (activeTool === "selectRect" || activeTool === "selectCircle") {
      if (toolPoints.length === 0) {
        addToolPoint(pt);
      } else if (activeTool === "selectRect") {
        void finishRectSelect(toolPoints[0], pt);
      } else {
        void finishCircleSelect(toolPoints[0], pt);
      }
    } else if (activeTool === "selectPolygon") {
      addToolPoint(pt);
    }
  }

  function handleDoubleClick() {
    const { activeTool, toolPoints } = useMapStore.getState();
    if (!activeTool) return false;
    if (activeTool === "measureDistance" && toolPoints.length >= 2) {
      setToolFrozen(true);
      return true;
    }
    if (activeTool === "measureArea" && toolPoints.length >= 3) {
      setToolFrozen(true);
      return true;
    }
    if (activeTool === "selectPolygon" && toolPoints.length >= 3) {
      void finishPolygonSelect(toolPoints);
      return true;
    }
    return false;
  }

  return { handleMapClick, handleDoubleClick, runBufferQuery };
}
