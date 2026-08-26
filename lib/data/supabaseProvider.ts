import { supabaseServer } from "@/lib/supabase/server";
import type { LicenceDetail, LicenceFeatureCollection } from "@/lib/types";
import type { AdminBoundariesGeoJSON, Bbox, DataProvider, NearestMatch, PointMatch, RegionMatch } from "./types";

function splitBoundaries(collection: GeoJSON.FeatureCollection): AdminBoundariesGeoJSON {
  const byKind = (kind: string): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: collection.features.filter((f) => f.properties?.kind === kind),
  });
  return { national: byKind("national"), provinces: byKind("province"), districts: byKind("district") };
}

export const supabaseProvider: DataProvider = {
  async getLicencesGeoJSON(bbox) {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc("licences_geojson", {
      bbox_xmin: bbox?.xmin ?? null,
      bbox_ymin: bbox?.ymin ?? null,
      bbox_xmax: bbox?.xmax ?? null,
      bbox_ymax: bbox?.ymax ?? null,
    });
    if (error) throw new Error(error.message);
    return data as LicenceFeatureCollection;
  },

  async getLicenceDetail(id) {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc("licence_detail", { p_id: id });
    if (error) throw new Error(error.message);
    return (data as LicenceDetail) ?? null;
  },

  async getLicenceAtPoint(lon, lat) {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc("licence_at_point", { p_lon: lon, p_lat: lat });
    if (error) throw new Error(error.message);
    return (data as PointMatch) ?? null;
  },

  async getNearestLicence(lon, lat) {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc("nearest_licence", { p_lon: lon, p_lat: lat });
    if (error) throw new Error(error.message);
    return (data as NearestMatch) ?? null;
  },

  async getLicencesWithinDistance(lon, lat, meters) {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc("licences_within_distance", { p_lon: lon, p_lat: lat, p_meters: meters });
    if (error) throw new Error(error.message);
    return (data as RegionMatch[]) ?? [];
  },

  async getLicencesInBbox(bbox: Bbox) {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc("licences_in_bbox", {
      bbox_xmin: bbox.xmin,
      bbox_ymin: bbox.ymin,
      bbox_xmax: bbox.xmax,
      bbox_ymax: bbox.ymax,
    });
    if (error) throw new Error(error.message);
    return (data as RegionMatch[]) ?? [];
  },

  async getLicencesInBuffer(lon, lat, radiusKm) {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc("licences_in_buffer", { p_lon: lon, p_lat: lat, p_radius_km: radiusKm });
    if (error) throw new Error(error.message);
    return (data as RegionMatch[]) ?? [];
  },

  async getBoundariesGeoJSON() {
    const supabase = supabaseServer();
    const { data, error } = await supabase.rpc("boundaries_geojson");
    if (error) throw new Error(error.message);
    return splitBoundaries(data as GeoJSON.FeatureCollection);
  },
};
