import * as turf from "@turf/turf";

export type LonLat = [number, number];

/** Great-circle distance between two lon/lat points, in kilometres. Client-side preview only. */
export function distanceKm(a: LonLat, b: LonLat): number {
  return turf.distance(turf.point(a), turf.point(b), { units: "kilometers" });
}

/** Total length of a lon/lat polyline, in kilometres. */
export function lineLengthKm(points: LonLat[]): number {
  if (points.length < 2) return 0;
  return turf.length(turf.lineString(points), { units: "kilometers" });
}

/** Area of a closed lon/lat ring, in square kilometres. Ring is auto-closed if needed. */
export function polygonAreaKm2(points: LonLat[]): number {
  if (points.length < 3) return 0;
  const ring = [...points];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  return turf.area(turf.polygon([ring])) / 1_000_000;
}

/** Centroid of a lon/lat polygon. */
export function polygonCentroid(points: LonLat[]): LonLat {
  const ring = [...points];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  const [lon, lat] = turf.centroid(turf.polygon([ring])).geometry.coordinates;
  return [lon, lat];
}

/** Client-side buffer preview (km radius) around a point. Authoritative buffer queries go through PostGIS ST_Buffer. */
export function bufferPreview(center: LonLat, radiusKm: number) {
  return turf.buffer(turf.point(center), radiusKm, { units: "kilometers" });
}

/** Bounding box [xmin, ymin, xmax, ymax] for a list of lon/lat points. */
export function boundingBox(points: LonLat[]): [number, number, number, number] {
  const lons = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}
