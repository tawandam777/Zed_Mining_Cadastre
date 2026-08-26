import type { LicenceDetail, LicenceFeatureCollection } from "@/lib/types";

export interface PointMatch {
  id: string;
  licenceNumber: string;
  owner: string;
  commodity: string;
  licenceType: string;
  status: string;
  province: string | null;
  areaHa: number | null;
  issueDate: string | null;
  expiryDate: string | null;
  geometry: GeoJSON.Geometry;
  centroid: GeoJSON.Point;
}

export interface NearestMatch {
  id: string;
  licenceNumber: string;
  owner: string;
  commodity: string;
  status: string;
  geometry: GeoJSON.Geometry;
  distanceMeters: number;
}

export interface RegionMatch {
  id: string;
  licenceNumber: string;
  owner: string;
  status: string;
  geometry: GeoJSON.Geometry;
  distanceMeters?: number;
}

export interface Bbox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface AdminBoundariesGeoJSON {
  national: GeoJSON.FeatureCollection;
  provinces: GeoJSON.FeatureCollection;
  districts: GeoJSON.FeatureCollection;
}

export interface DataProvider {
  getLicencesGeoJSON(bbox?: Bbox): Promise<LicenceFeatureCollection>;
  getLicenceDetail(id: string): Promise<LicenceDetail | null>;
  getLicenceAtPoint(lon: number, lat: number): Promise<PointMatch | null>;
  getNearestLicence(lon: number, lat: number): Promise<NearestMatch | null>;
  getLicencesWithinDistance(lon: number, lat: number, meters: number): Promise<RegionMatch[]>;
  getLicencesInBbox(bbox: Bbox): Promise<RegionMatch[]>;
  getLicencesInBuffer(lon: number, lat: number, radiusKm: number): Promise<RegionMatch[]>;
  getBoundariesGeoJSON(): Promise<AdminBoundariesGeoJSON>;
}
