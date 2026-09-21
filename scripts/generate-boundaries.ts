/**
 * Pre-processes the real Zambia admin boundary shapefiles (Admin_Bounds/*.shp)
 * into a single static GeoJSON file, the same "generate once, commit, import
 * at runtime" pattern already used for licence geometry (see
 * scripts/generate-licences.ts / lib/data/licences.generated.json).
 *
 * Why: the raw shapefiles convert to ~40MB of GeoJSON (districts alone are
 * ~31MB / 800k vertices — COD-AB survey-grade detail, far finer than a
 * country-scale web map needs), which is what made /api/boundaries slow:
 * parsing+serializing that much JSON on every cold serverless invocation,
 * shipping it over the network, and having OpenLayers render 800k+ vertices
 * client-side. Simplifying once at generate-time and committing the result
 * fixes all three at once instead of just caching/hiding the latency.
 *
 * District and province geometry (display-only — never used for point-in-
 * polygon or other authoritative geometry ops anywhere in the app) is
 * simplified with turf.simplify. National boundary is left untouched: it's
 * tiny (one feature) and generate-licences.ts relies on it for exact
 * containment checks. Province tolerance is intentionally much finer than
 * district tolerance because findProvinceForPoint() (used by
 * generate-licences.ts to assign each licence's province) does its point-in-
 * polygon check against this same province geometry — 0.0005deg (~55m) is
 * far smaller than any realistic distance between a generated licence
 * centroid and a province border.
 *
 * Usage: npx tsx scripts/generate-boundaries.ts
 */
import fs from "node:fs";
import path from "node:path";
import * as turf from "@turf/turf";
import { loadShapefile } from "../lib/data/shapefileLoader";

const DISTRICT_SIMPLIFY_TOLERANCE = 0.001; // ~111m
const PROVINCE_SIMPLIFY_TOLERANCE = 0.0005; // ~55m

function simplify<T extends GeoJSON.Polygon | GeoJSON.MultiPolygon>(
  fc: GeoJSON.FeatureCollection<T>,
  tolerance: number,
): GeoJSON.FeatureCollection<T> {
  return turf.simplify(fc, { tolerance, highQuality: true, mutate: false });
}

async function main() {
  const [nationalRaw, provincesRaw, districtsRaw] = await Promise.all([
    loadShapefile("Zambia Boundary", "Zambia Boundary"),
    loadShapefile("Zambia Provinces", "Zambia Provinces"),
    loadShapefile("Zambia Districts", "Zambia Districts"),
  ]);

  const national: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: nationalRaw.features.map((f) => ({
      ...f,
      properties: { name: "Zambia", kind: "national" },
    })),
  };

  const provincesNamed: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: provincesRaw.features.map((f) => ({
      ...f,
      properties: { name: f.properties?.adm1_name, kind: "province" },
    })),
  };
  const provinces = simplify(
    provincesNamed as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
    PROVINCE_SIMPLIFY_TOLERANCE,
  );

  const districtsNamed: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: districtsRaw.features.map((f) => ({
      ...f,
      properties: {
        name: f.properties?.adm2_name,
        province: f.properties?.adm1_name,
        kind: "district",
      },
    })),
  };
  const districts = simplify(
    districtsNamed as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
    DISTRICT_SIMPLIFY_TOLERANCE,
  );

  const output = { national, provinces, districts };
  // Minified, not pretty-printed like licences.generated.json: this file is
  // orders of magnitude larger (coordinate-heavy) and nobody diffs it by eye,
  // so indentation whitespace is pure waste in the served payload and JS bundle.
  const json = JSON.stringify(output);
  const outPath = path.resolve(process.cwd(), "lib/data/boundaries.generated.json");
  fs.writeFileSync(outPath, json);

  console.log(
    `Wrote ${outPath} (${(json.length / 1024 / 1024).toFixed(2)}MB): ` +
      `1 national + ${provinces.features.length} province + ${districts.features.length} district features.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
