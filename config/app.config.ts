export type CoordinateFormat = "dd" | "dms" | "utm";

export const DEFAULT_COORDINATE_FORMAT: CoordinateFormat = "dd";

/** Display projection used by the OpenLayers view. Storage/API stay in EPSG:4326. */
export const DISPLAY_PROJECTION = "EPSG:3857";
export const STORAGE_PROJECTION = "EPSG:4326";

/**
 * Zambia's real national boundary bounding box (lon/lat), used for the
 * initial view center and the Home button's reset extent. Computed from
 * Admin_Bounds/Zambia Boundary/Zambia Boundary.shp — update this if that
 * shapefile is ever replaced.
 */
export const HOME_EXTENT_LONLAT: [number, number, number, number] = [21.9993, -18.0774, 33.7091, -8.272];

export const FEATURE_FLAGS = {
  vectorTiles: false,
  fileImport: false,
  pdfExport: false,
};
