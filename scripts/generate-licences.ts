/**
 * Regenerates mining-licence geometry from scratch while preserving every
 * existing attribute (owner, commodity, status, type, area, dates, licence
 * number). The old geometries (unprojected from the cadastre-data.js SVG
 * mock) are discarded entirely.
 *
 * Constraints (per product requirements):
 *  - Licence polygons must never overlap.
 *  - Licence polygons should tile adjacently (touching) within a cluster.
 *  - The majority of licences concentrate in North-Western and Copperbelt
 *    provinces (Zambia's real copper/cobalt belt); the rest are scattered
 *    thinly across the other 8 provinces.
 *  - Every polygon must lie within the real Zambia national boundary.
 *
 * Approach: shelf/skyline bin-packing per province cluster (rectangles
 * sized from each licence's real area_ha, anchored at a guaranteed-interior
 * point of the target province via turf.pointOnFeature), then a global
 * containment + overlap safety pass. Output is a static GeoJSON file
 * consumed by lib/data/localProvider.ts and supabase/seed/seed.ts, so the
 * (Turf-heavy) generation only ever runs once, not on every request.
 *
 * Usage: npx tsx scripts/generate-licences.ts
 */
import fs from "node:fs";
import path from "node:path";
import * as turf from "@turf/turf";
import { loadCadastreData } from "../lib/data/referenceGeometry";
import { getAdminBoundaries, findProvinceForPoint } from "../lib/data/adminBoundaries";

type LonLat = [number, number];

const CLUSTER_PROVINCES = ["North-Western", "Copperbelt"];
const OTHER_PROVINCES = [
  "Central", "Eastern", "Luapula", "Lusaka", "Muchinga", "Northern", "Southern", "Western",
];

interface LicenceAttrs {
  number: string;
  owner: string;
  commodity: string;
  licenceType: string;
  status: string;
  areaHa: number;
  issueDate: string;
  expiryDate: string;
}

interface PlacedLicence extends LicenceAttrs {
  ring: LonLat[];
  province: string;
}

function kmToDegLat(km: number): number {
  return km / 111;
}
function kmToDegLon(km: number, atLat: number): number {
  return km / (111 * Math.cos((atLat * Math.PI) / 180));
}

function rectRing(originLon: number, originLat: number, wDeg: number, hDeg: number): LonLat[] {
  return [
    [originLon, originLat],
    [originLon + wDeg, originLat],
    [originLon + wDeg, originLat + hDeg],
    [originLon, originLat + hDeg],
    [originLon, originLat],
  ];
}

function ringCenter(ring: LonLat[]): LonLat {
  const lons = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
}

function translateRing(ring: LonLat[], dLon: number, dLat: number): LonLat[] {
  return ring.map(([lon, lat]) => [lon + dLon, lat + dLat]);
}

// A small real-world gap between adjacent parcels (~90m). Visually indistinguishable at any
// map zoom level a user would view licences at, but keeps parcels *robustly* non-overlapping —
// relying on exact shared edges is numerically fragile (see GAP_DEG usage note below).
const GAP_DEG = 0.0008;

/** Shelf (skyline) bin-packing: places same-corner-anchored squares left-to-right, wrapping rows. Guarantees adjacency + non-overlap. */
function shelfPack(items: { id: string; sideDegLon: number; sideDegLat: number }[]): Map<string, LonLat[]> {
  const n = items.length;
  const avgSide = items.reduce((s, it) => s + it.sideDegLon, 0) / n;
  const maxRowWidth = Math.ceil(Math.sqrt(n)) * avgSide * 1.15;

  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  const placed = new Map<string, LonLat[]>();

  for (const item of items) {
    if (cursorX > 0 && cursorX + item.sideDegLon > maxRowWidth) {
      cursorY += rowHeight + GAP_DEG;
      cursorX = 0;
      rowHeight = 0;
    }
    placed.set(item.id, rectRing(cursorX, cursorY, item.sideDegLon, item.sideDegLat));
    cursorX += item.sideDegLon + GAP_DEG;
    rowHeight = Math.max(rowHeight, item.sideDegLat);
  }
  return placed;
}

function fullyWithin(ring: LonLat[], container: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>): boolean {
  return ring.every(([lon, lat]) => turf.booleanPointInPolygon(turf.point([lon, lat]), container));
}

async function placeGroup(
  attrs: LicenceAttrs[],
  provinceName: string,
  nationalFeature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
  provinceList: { name: string; feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> }[],
): Promise<PlacedLicence[]> {
  const provinceEntry = provinceList.find((p) => p.name.toLowerCase() === provinceName.toLowerCase());
  if (!provinceEntry) throw new Error(`Province not found in shapefile: ${provinceName}`);

  const anchor = turf.pointOnFeature(provinceEntry.feature).geometry.coordinates as LonLat;
  const refLat = anchor[1];

  const items = attrs.map((a) => {
    const areaKm2 = a.areaHa / 100;
    const sideKm = Math.max(2, Math.sqrt(areaKm2));
    return {
      id: a.number,
      sideDegLon: kmToDegLon(sideKm, refLat),
      sideDegLat: kmToDegLat(sideKm),
    };
  });

  let packed = shelfPack(items);

  // Center the packed block on the anchor point (a guaranteed-interior point of the province).
  const allPoints = [...packed.values()].flat();
  const blockCenter = ringCenter(allPoints);
  let dLon = anchor[0] - blockCenter[0];
  let dLat = anchor[1] - blockCenter[1];

  const applyOffset = () =>
    new Map([...packed.entries()].map(([id, ring]) => [id, translateRing(ring, dLon, dLat)]));

  let placedRings = applyOffset();

  // Safety net: if the block spills outside Zambia's real boundary, shrink toward the anchor and retry.
  for (let attempt = 0; attempt < 6; attempt++) {
    const allWithin = [...placedRings.values()].every((ring) => fullyWithin(ring, nationalFeature));
    if (allWithin) break;
    packed = new Map(
      [...packed.entries()].map(([id, ring]) => [
        id,
        ring.map(([lon, lat]) => [
          blockCenter[0] + (lon - blockCenter[0]) * 0.75,
          blockCenter[1] + (lat - blockCenter[1]) * 0.75,
        ] as LonLat),
      ]),
    );
    const shrunkPoints = [...packed.values()].flat();
    const newCenter = ringCenter(shrunkPoints);
    dLon = anchor[0] - newCenter[0];
    dLat = anchor[1] - newCenter[1];
    placedRings = applyOffset();
  }

  const results: PlacedLicence[] = [];
  for (const a of attrs) {
    const ring = placedRings.get(a.number)!;
    const centroid = ringCenter(ring);
    const actualProvince = (await findProvinceForPoint(centroid[0], centroid[1])) ?? provinceName;
    results.push({ ...a, ring, province: actualProvince });
  }
  return results;
}

// Real intersection area, not turf.booleanOverlap: exactly-touching (shared-edge) polygons are
// legitimate adjacency, but booleanOverlap's internal clipping can report a zero-area "overlap"
// for them due to floating-point edge coincidence — verified empirically (intersection area 0,
// booleanOverlap true) while building this generator.
const OVERLAP_EPSILON_KM2 = 1e-6;

function checkNoOverlaps(all: PlacedLicence[]): string[] {
  const problems: string[] = [];
  const polys = all.map((l) => ({ id: l.number, poly: turf.polygon([l.ring]), bbox: turf.bbox(turf.polygon([l.ring])) }));
  for (let i = 0; i < polys.length; i++) {
    for (let j = i + 1; j < polys.length; j++) {
      const [aXmin, aYmin, aXmax, aYmax] = polys[i].bbox;
      const [bXmin, bYmin, bXmax, bYmax] = polys[j].bbox;
      if (aXmax < bXmin || bXmax < aXmin || aYmax < bYmin || bYmax < aYmin) continue;
      const inter = turf.intersect(turf.featureCollection([polys[i].poly, polys[j].poly]));
      const area = inter ? turf.area(inter) / 1_000_000 : 0;
      if (area > OVERLAP_EPSILON_KM2) {
        problems.push(`${polys[i].id} overlaps ${polys[j].id} (${area.toFixed(4)} km²)`);
      }
    }
  }
  return problems;
}

async function main() {
  const data = loadCadastreData();
  const { national, provinceList } = await getAdminBoundaries();
  const nationalFeature = national.features[0] as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

  const attrs: LicenceAttrs[] = data.licenses.map((l) => ({
    number: l.number,
    owner: l.owner,
    commodity: l.commodity,
    licenceType: l.licenceType,
    status: l.status,
    areaHa: Math.round(l.areaKm2 * 100 * 10) / 10,
    issueDate: l.issueDate,
    expiryDate: l.expiryDate,
  }));

  console.log(`Loaded ${attrs.length} licence attribute records (geometry discarded).`);

  const clusterGroup: LicenceAttrs[] = [];
  const otherByProvince = new Map<string, LicenceAttrs[]>();

  attrs.forEach((a, i) => {
    if (i % 10 < 7) {
      clusterGroup.push(a);
    } else {
      const province = OTHER_PROVINCES[i % OTHER_PROVINCES.length];
      if (!otherByProvince.has(province)) otherByProvince.set(province, []);
      otherByProvince.get(province)!.push(a);
    }
  });

  // Split the cluster group between North-Western and Copperbelt.
  const nwGroup = clusterGroup.filter((_, i) => i % 2 === 0);
  const cbGroup = clusterGroup.filter((_, i) => i % 2 === 1);

  const placed: PlacedLicence[] = [];
  placed.push(...(await placeGroup(nwGroup, CLUSTER_PROVINCES[0], nationalFeature, provinceList)));
  placed.push(...(await placeGroup(cbGroup, CLUSTER_PROVINCES[1], nationalFeature, provinceList)));
  for (const [province, group] of otherByProvince) {
    placed.push(...(await placeGroup(group, province, nationalFeature, provinceList)));
  }

  console.log(`Placed ${placed.length} licences: ${nwGroup.length} North-Western, ${cbGroup.length} Copperbelt, ${clusterGroup.length === attrs.length ? 0 : attrs.length - clusterGroup.length} scattered.`);

  const overlaps = checkNoOverlaps(placed);
  if (overlaps.length > 0) {
    console.warn(`WARNING: ${overlaps.length} overlap(s) detected:`, overlaps.slice(0, 10));
  } else {
    console.log("No overlaps detected across all placed licences.");
  }

  const outOfBounds = placed.filter((p) => !fullyWithin(p.ring, nationalFeature));
  if (outOfBounds.length > 0) {
    console.warn(`WARNING: ${outOfBounds.length} licence(s) not fully within the national boundary:`, outOfBounds.map((p) => p.number));
  } else {
    console.log("All licences fully within the Zambia national boundary.");
  }

  const featureCollection = {
    type: "FeatureCollection" as const,
    features: placed.map((p) => ({
      type: "Feature" as const,
      id: p.number,
      properties: {
        id: p.number,
        licenceNumber: p.number,
        owner: p.owner,
        commodity: p.commodity,
        licenceType: p.licenceType,
        status: p.status,
        province: p.province,
        areaHa: p.areaHa,
        issueDate: p.issueDate,
        expiryDate: p.expiryDate,
      },
      geometry: { type: "Polygon" as const, coordinates: [p.ring] },
    })),
  };

  const outPath = path.resolve(process.cwd(), "lib/data/licences.generated.json");
  fs.writeFileSync(outPath, JSON.stringify(featureCollection, null, 2));
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
