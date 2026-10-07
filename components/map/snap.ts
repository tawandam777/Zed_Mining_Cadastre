import type VectorSource from "ol/source/Vector";
import type Feature from "ol/Feature";
import type { Coordinate } from "ol/coordinate";

/**
 * Pure, synchronous nearest-vertex/nearest-edge-point search against licence plot geometry —
 * deliberately NOT built on ol/interaction/Snap.
 *
 * ol/interaction/Snap is a full OL Interaction: its handleEvent runs on every raw browser
 * pointer event (100-200+/sec on modern hardware is normal), completely bypassing the
 * requestAnimationFrame throttle MapCanvas already relies on for pointermove (see the
 * "pointermove is rAF-throttled" note in CLAUDE.md — that fix exists specifically because
 * unthrottled per-event work on this path causes exactly this lag). Snap's own spatial search
 * running on top of that, every raw event, is what caused the reported lag when zoomed in and
 * using a sketch tool, and why snapping felt imprecise rather than just slow: it was lagging
 * behind the cursor, not computing the wrong point. Calling this function instead, once per
 * animation frame from inside MapCanvas's already-throttled processPointerMove, keeps snapping
 * on the same frame budget as everything else on that path.
 *
 * All math happens in map-projection coordinates (EPSG:3857), not pixels — tolerance is
 * converted from pixels to map units via the view's current resolution once by the caller, the
 * same approach ol/interaction/Snap itself uses internally (see
 * node_modules/ol/interaction/Snap.js's use of `view.getResolution() * pixelTolerance`).
 */

function getRings(feature: Feature): Coordinate[][] {
  const geom = feature.getGeometry();
  if (!geom) return [];
  const type = geom.getType();
  if (type === "Polygon") return (geom as import("ol/geom/Polygon").default).getCoordinates();
  if (type === "MultiPolygon") return (geom as import("ol/geom/MultiPolygon").default).getCoordinates().flat();
  return [];
}

function squaredDistance(a: Coordinate, b: Coordinate): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/** Closest point on segment [a, b] to point p, clamped to the segment (not the infinite line). */
function closestPointOnSegment(p: Coordinate, a: Coordinate, b: Coordinate): Coordinate {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return a;
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return [a[0] + t * dx, a[1] + t * dy];
}

export interface SnapFlags {
  vertex: boolean;
  edge: boolean;
}

/**
 * Returns the nearest vertex/edge point (map coordinates) to `cursor` across all features in
 * `source` within `toleranceMapUnits`, honoring which of vertex/edge snapping is enabled, or
 * null if nothing qualifies. A plain linear scan over vertices/segments of only the features
 * returned by source.getFeaturesInExtent() (OL's own spatially-indexed coarse filter) — at this
 * app's scale (~56 licence parcels) that's a handful of candidate features per call, cheap
 * enough to run every animation frame.
 */
export function findSnapPoint(
  source: VectorSource,
  cursor: Coordinate,
  toleranceMapUnits: number,
  flags: SnapFlags,
): Coordinate | null {
  if (!flags.vertex && !flags.edge) return null;

  const extent: [number, number, number, number] = [
    cursor[0] - toleranceMapUnits,
    cursor[1] - toleranceMapUnits,
    cursor[0] + toleranceMapUnits,
    cursor[1] + toleranceMapUnits,
  ];
  const candidates = source.getFeaturesInExtent(extent);
  if (candidates.length === 0) return null;

  const toleranceSq = toleranceMapUnits * toleranceMapUnits;
  let best: Coordinate | null = null;
  let bestDistSq = toleranceSq;

  for (const feature of candidates) {
    for (const ring of getRings(feature)) {
      for (let i = 0; i < ring.length; i++) {
        const v = ring[i];
        if (flags.vertex) {
          const d = squaredDistance(cursor, v);
          if (d < bestDistSq) {
            bestDistSq = d;
            best = v;
          }
        }
        if (flags.edge && i < ring.length - 1) {
          const closest = closestPointOnSegment(cursor, v, ring[i + 1]);
          const d = squaredDistance(cursor, closest);
          if (d < bestDistSq) {
            bestDistSq = d;
            best = closest;
          }
        }
      }
    }
  }

  return best;
}
