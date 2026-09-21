import * as turf from "@turf/turf";
import boundariesGenerated from "./boundaries.generated.json";

export interface NamedFeature {
  name: string;
  feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
}

interface AdminBoundaries {
  national: GeoJSON.FeatureCollection;
  provinces: GeoJSON.FeatureCollection;
  districts: GeoJSON.FeatureCollection;
  provinceList: NamedFeature[];
}

// Pre-simplified and committed by scripts/generate-boundaries.ts — see that
// file for why (the raw Admin_Bounds/*.shp shapefiles are ~40MB of GeoJSON
// once converted, which is what made boundary loading slow; parsing them at
// request time is no longer necessary once the result is static).
let cached: AdminBoundaries | null = null;

function build(): AdminBoundaries {
  const { national, provinces, districts } = boundariesGenerated as unknown as {
    national: GeoJSON.FeatureCollection;
    provinces: GeoJSON.FeatureCollection;
    districts: GeoJSON.FeatureCollection;
  };

  const provinceList: NamedFeature[] = provinces.features.map((f) => ({
    name: f.properties!.name as string,
    feature: f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
  }));

  return { national, provinces, districts, provinceList };
}

export async function getAdminBoundaries(): Promise<AdminBoundaries> {
  if (!cached) cached = build();
  return cached;
}

export async function findProvinceForPoint(lon: number, lat: number): Promise<string | null> {
  const { provinceList } = await getAdminBoundaries();
  const pt = turf.point([lon, lat]);
  const match = provinceList.find((p) => turf.booleanPointInPolygon(pt, p.feature));
  return match?.name ?? null;
}

export async function getProvinceFeature(name: string): Promise<NamedFeature | null> {
  const { provinceList } = await getAdminBoundaries();
  return provinceList.find((p) => p.name.toLowerCase() === name.toLowerCase()) ?? null;
}
