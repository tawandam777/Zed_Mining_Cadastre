import { distanceKm, lineLengthKm, polygonAreaKm2 } from "@/lib/geo";
import type { SpatialTool, LonLat } from "@/store/useMapStore";

function rectRing(a: LonLat, b: LonLat): LonLat[] {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const xmin = Math.min(x1, x2);
  const xmax = Math.max(x1, x2);
  const ymin = Math.min(y1, y2);
  const ymax = Math.max(y1, y2);
  return [
    [xmin, ymin],
    [xmax, ymin],
    [xmax, ymax],
    [xmin, ymax],
    [xmin, ymin],
  ];
}

/**
 * Live cursor-following measurement text for drag-based tools — updates on every
 * pointermove, not just after a click, so the value tracks the cursor while dragging.
 * Returns null for tools where a live cursor value doesn't make sense (identify,
 * buffer — buffer's radius comes from a slider, not the cursor).
 */
export function computeLiveMeasurementText(tool: SpatialTool, points: LonLat[], cursor: LonLat): string | null {
  switch (tool) {
    case "measureDistance": {
      if (points.length === 0) return null;
      return `${lineLengthKm([...points, cursor]).toFixed(2)} km`;
    }
    case "measureArea":
    case "selectPolygon": {
      if (points.length < 2) return null;
      return `${polygonAreaKm2([...points, cursor]).toFixed(2)} km²`;
    }
    case "selectRect": {
      if (points.length !== 1) return null;
      return `${polygonAreaKm2(rectRing(points[0], cursor)).toFixed(2)} km²`;
    }
    case "selectCircle": {
      if (points.length !== 1) return null;
      return `${distanceKm(points[0], cursor).toFixed(2)} km radius`;
    }
    default:
      return null;
  }
}
