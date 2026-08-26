/**
 * Fully offline data provider: serves the regenerated Zambia licence dataset
 * (lib/data/licences.generated.json — see scripts/generate-licences.ts) and
 * the real Zambia admin boundary shapefiles from memory (no database),
 * answering spatial queries with Turf.js instead of PostGIS. Used
 * automatically when no Supabase env vars are configured — see
 * lib/data/index.ts.
 *
 * Trade-off vs. the PostGIS provider: nearest/within/buffer queries here are
 * computed against each licence's centroid, not full polygon distance like
 * PostGIS's ST_Distance/ST_DWithin. Fine for offline dev with ~55 features;
 * the PostGIS provider is exact and should be used for anything resembling
 * production.
 */
import * as turf from "@turf/turf";
import type { LicenceDetail, LicenceFeatureCollection, LicenceFeature, LicenceProperties } from "@/lib/types";
import { getAdminBoundaries } from "./adminBoundaries";
import type { AdminBoundariesGeoJSON, Bbox, DataProvider, NearestMatch, PointMatch, RegionMatch } from "./types";
import licencesGeneratedRaw from "./licences.generated.json";

interface LocalLicence {
  properties: LicenceProperties;
  ring: [number, number][];
  polygon: GeoJSON.Feature<GeoJSON.Polygon>;
  centroid: [number, number];
}

let licenceCache: LocalLicence[] | null = null;

function buildLicenceCache(): LocalLicence[] {
  const collection = licencesGeneratedRaw as unknown as GeoJSON.FeatureCollection;
  return collection.features.map((f) => {
    const ring = (f.geometry as GeoJSON.Polygon).coordinates[0] as [number, number][];
    const polygon = turf.polygon([ring]);
    const centroid = turf.centroid(polygon).geometry.coordinates as [number, number];
    return { properties: f.properties as unknown as LicenceProperties, ring, polygon, centroid };
  });
}

function getLicences(): LocalLicence[] {
  if (!licenceCache) licenceCache = buildLicenceCache();
  return licenceCache;
}

function toFeature(l: LocalLicence): LicenceFeature {
  return {
    type: "Feature",
    id: l.properties.id,
    properties: l.properties,
    geometry: { type: "Polygon", coordinates: [l.ring] },
  };
}

export const localProvider: DataProvider = {
  async getLicencesGeoJSON(bbox) {
    const licences = getLicences();
    const filtered = bbox
      ? licences.filter((l) => turf.booleanIntersects(l.polygon, turf.bboxPolygon([bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax])))
      : licences;
    const collection: LicenceFeatureCollection = { type: "FeatureCollection", features: filtered.map(toFeature) };
    return collection;
  },

  async getLicenceDetail(id) {
    const licences = getLicences();
    const l = licences.find((x) => x.properties.id === id);
    if (!l) return null;
    const line = turf.lineString(l.ring);
    const detail: LicenceDetail = {
      ...l.properties,
      metadata: {},
      geometry: { type: "Polygon", coordinates: [l.ring] },
      centroid: { type: "Point", coordinates: l.centroid },
      areaSqKm: turf.area(l.polygon) / 1_000_000,
      perimeterKm: turf.length(line, { units: "kilometers" }),
    };
    return detail;
  },

  async getLicenceAtPoint(lon, lat) {
    const licences = getLicences();
    const pt = turf.point([lon, lat]);
    const match = licences.find((l) => turf.booleanPointInPolygon(pt, l.polygon));
    if (!match) return null;
    const result: PointMatch = {
      ...match.properties,
      geometry: { type: "Polygon", coordinates: [match.ring] },
      centroid: { type: "Point", coordinates: match.centroid },
    };
    return result;
  },

  async getNearestLicence(lon, lat) {
    const licences = getLicences();
    if (licences.length === 0) return null;
    const pt = turf.point([lon, lat]);
    let best: { l: LocalLicence; distKm: number } | null = null;
    for (const l of licences) {
      const distKm = turf.distance(pt, turf.point(l.centroid), { units: "kilometers" });
      if (!best || distKm < best.distKm) best = { l, distKm };
    }
    if (!best) return null;
    const result: NearestMatch = {
      id: best.l.properties.id,
      licenceNumber: best.l.properties.licenceNumber,
      owner: best.l.properties.owner,
      commodity: best.l.properties.commodity,
      status: best.l.properties.status,
      geometry: { type: "Polygon", coordinates: [best.l.ring] },
      distanceMeters: best.distKm * 1000,
    };
    return result;
  },

  async getLicencesWithinDistance(lon, lat, meters) {
    const licences = getLicences();
    const pt = turf.point([lon, lat]);
    const results: RegionMatch[] = [];
    for (const l of licences) {
      const distKm = turf.distance(pt, turf.point(l.centroid), { units: "kilometers" });
      if (distKm * 1000 <= meters) {
        results.push({
          id: l.properties.id,
          licenceNumber: l.properties.licenceNumber,
          owner: l.properties.owner,
          status: l.properties.status,
          geometry: { type: "Polygon", coordinates: [l.ring] },
          distanceMeters: distKm * 1000,
        });
      }
    }
    return results;
  },

  async getLicencesInBbox(bbox: Bbox) {
    const licences = getLicences();
    const bboxPoly = turf.bboxPolygon([bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax]);
    return licences
      .filter((l) => turf.booleanIntersects(l.polygon, bboxPoly))
      .map((l) => ({
        id: l.properties.id,
        licenceNumber: l.properties.licenceNumber,
        owner: l.properties.owner,
        status: l.properties.status,
        geometry: { type: "Polygon" as const, coordinates: [l.ring] },
      }));
  },

  async getLicencesInBuffer(lon, lat, radiusKm) {
    const licences = getLicences();
    const pt = turf.point([lon, lat]);
    return licences
      .filter((l) => turf.distance(pt, turf.point(l.centroid), { units: "kilometers" }) <= radiusKm)
      .map((l) => ({
        id: l.properties.id,
        licenceNumber: l.properties.licenceNumber,
        owner: l.properties.owner,
        status: l.properties.status,
        geometry: { type: "Polygon" as const, coordinates: [l.ring] },
      }));
  },

  async getBoundariesGeoJSON(): Promise<AdminBoundariesGeoJSON> {
    const { national, provinces, districts } = await getAdminBoundaries();
    return { national, provinces, districts };
  },
};
