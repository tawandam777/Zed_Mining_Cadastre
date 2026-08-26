/**
 * Seeds Supabase/PostGIS with:
 *  - the regenerated mining-licence dataset (lib/data/licences.generated.json —
 *    see scripts/generate-licences.ts for how it was produced), and
 *  - the real Zambia admin boundaries (national / province / district) read
 *    directly from the Admin_Bounds/*.shp shapefiles.
 *
 * Usage: npm run seed
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { getAdminBoundaries } from "@/lib/data/adminBoundaries";
import licencesGenerated from "@/lib/data/licences.generated.json";

function ringToWkt(ring: number[][]): string {
  return `(${ring.map(([lon, lat]) => `${lon} ${lat}`).join(", ")})`;
}

function geometryToEwkt(geom: GeoJSON.Geometry): string {
  if (geom.type === "Polygon") {
    return `SRID=4326;POLYGON(${geom.coordinates.map(ringToWkt).join(", ")})`;
  }
  if (geom.type === "MultiPolygon") {
    const polys = geom.coordinates.map((poly) => `(${poly.map(ringToWkt).join(", ")})`);
    return `SRID=4326;MULTIPOLYGON(${polys.join(", ")})`;
  }
  throw new Error(`Unsupported boundary geometry type: ${geom.type}`);
}

function licenceRingToEwktMultiPolygon(ring: number[][]): string {
  return `SRID=4326;MULTIPOLYGON((${ringToWkt(ring)}))`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.local.example)");
  }
  const supabase = createClient(url, serviceRoleKey);

  const licenceCollection = licencesGenerated as unknown as GeoJSON.FeatureCollection;
  console.log(`Loaded ${licenceCollection.features.length} generated licences.`);

  const licenceRows = licenceCollection.features.map((f) => {
    const p = f.properties as Record<string, unknown>;
    const ring = (f.geometry as GeoJSON.Polygon).coordinates[0];
    return {
      licence_number: p.licenceNumber,
      owner: p.owner,
      commodity: p.commodity,
      licence_type: p.licenceType,
      status: p.status,
      province: p.province,
      area_ha: p.areaHa,
      issue_date: p.issueDate,
      expiry_date: p.expiryDate,
      metadata: {},
      geom: licenceRingToEwktMultiPolygon(ring),
    };
  });

  console.log("Loading admin boundary shapefiles (national/provinces/districts)...");
  const { national, provinces, districts } = await getAdminBoundaries();

  const boundaryRows = [
    ...national.features.map((f) => ({
      name: (f.properties as { name: string }).name,
      parent_name: null,
      kind: "national",
      geom: geometryToEwkt(f.geometry),
    })),
    ...provinces.features.map((f) => ({
      name: (f.properties as { name: string }).name,
      parent_name: null,
      kind: "province",
      geom: geometryToEwkt(f.geometry),
    })),
    ...districts.features.map((f) => ({
      name: (f.properties as { name: string }).name,
      parent_name: (f.properties as { province: string }).province,
      kind: "district",
      geom: geometryToEwkt(f.geometry),
    })),
  ];
  console.log(`Loaded ${boundaryRows.length} boundary features (1 national + ${provinces.features.length} province + ${districts.features.length} district).`);

  console.log("Clearing existing licences/boundaries...");
  await supabase.from("licences").delete().not("id", "is", null);
  await supabase.from("boundaries").delete().not("id", "is", null);

  console.log("Inserting licences...");
  const { error: licenceError } = await supabase.from("licences").insert(licenceRows);
  if (licenceError) throw licenceError;

  console.log("Inserting boundaries...");
  const { error: boundaryError } = await supabase.from("boundaries").insert(boundaryRows);
  if (boundaryError) throw boundaryError;

  console.log(`Seed complete: ${licenceRows.length} licences, ${boundaryRows.length} boundaries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
