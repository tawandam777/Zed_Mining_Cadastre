import * as turf from "@turf/turf";
import { loadShapefile } from "./shapefileLoader";

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

let cached: Promise<AdminBoundaries> | null = null;

async function build(): Promise<AdminBoundaries> {
  const [nationalRaw, provincesRaw, districtsRaw] = await Promise.all([
    loadShapefile("Admin_Bounds/Zambia Boundary", "Zambia Boundary"),
    loadShapefile("Admin_Bounds/Zambia Provinces", "Zambia Provinces"),
    loadShapefile("Admin_Bounds/Zambia Districts", "Zambia Districts"),
  ]);

  const national: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: nationalRaw.features.map((f) => ({
      ...f,
      properties: { name: "Zambia", kind: "national" },
    })),
  };

  const provinces: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: provincesRaw.features.map((f) => ({
      ...f,
      properties: { name: f.properties?.adm1_name, kind: "province" },
    })),
  };

  const districts: GeoJSON.FeatureCollection = {
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

  const provinceList: NamedFeature[] = provinces.features.map((f) => ({
    name: f.properties!.name as string,
    feature: f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
  }));

  return { national, provinces, districts, provinceList };
}

export function getAdminBoundaries(): Promise<AdminBoundaries> {
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
