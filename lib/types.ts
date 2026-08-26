import type { LicenceStatus } from "./theme";

export interface LicenceProperties {
  id: string;
  licenceNumber: string;
  owner: string;
  commodity: string;
  licenceType: string;
  status: LicenceStatus;
  province: string | null;
  areaHa: number | null;
  issueDate: string | null;
  expiryDate: string | null;
}

export interface LicenceDetail extends LicenceProperties {
  metadata: Record<string, unknown>;
  geometry: GeoJSON.Geometry;
  centroid: GeoJSON.Point;
  areaSqKm: number;
  perimeterKm: number;
}

export interface LicenceFeature extends GeoJSON.Feature {
  properties: LicenceProperties;
}

export interface LicenceFeatureCollection extends GeoJSON.FeatureCollection {
  features: LicenceFeature[];
}
