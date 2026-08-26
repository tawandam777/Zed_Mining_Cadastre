export type BasemapKind = "xyz" | "wmts";

export interface BasemapDefinition {
  id: string;
  label: string;
  kind: BasemapKind;
  /** XYZ URL template, e.g. "https://.../{z}/{x}/{y}.png" */
  url?: string;
  attributions?: string;
  maxZoom?: number;
  /** Only render this basemap if this env var resolves to a truthy value. */
  requiresEnv?: "NEXT_PUBLIC_GOOGLE_MAPS_KEY";
  /** Swatch color shown in the layer tree before the tile loads. */
  swatch: string;
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

export const BASEMAPS: BasemapDefinition[] = [
  {
    id: "osm",
    label: "Streets",
    kind: "xyz",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attributions: "© OpenStreetMap contributors",
    maxZoom: 19,
    swatch: "#E7ECE0",
  },
  {
    id: "esri-imagery",
    label: "Satellite",
    kind: "xyz",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attributions: "Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
    swatch: "#16201B",
  },
  {
    id: "esri-topo",
    label: "Terrain",
    kind: "xyz",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attributions: "Esri, HERE, Garmin, FAO, NOAA, USGS",
    maxZoom: 19,
    swatch: "#CDD6C4",
  },
  {
    id: "google-roadmap",
    label: "Google Streets",
    kind: "xyz",
    url: `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY ?? ""}`,
    attributions: "© Google",
    maxZoom: 20,
    requiresEnv: "NEXT_PUBLIC_GOOGLE_MAPS_KEY",
    swatch: "#E7ECE0",
  },
  {
    id: "google-satellite",
    label: "Google Satellite",
    kind: "xyz",
    url: `https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_KEY ?? ""}`,
    attributions: "© Google",
    maxZoom: 20,
    requiresEnv: "NEXT_PUBLIC_GOOGLE_MAPS_KEY",
    swatch: "#16201B",
  },
];

export function availableBasemaps(): BasemapDefinition[] {
  return BASEMAPS.filter((b) => !b.requiresEnv || Boolean(process.env[b.requiresEnv]));
}

/** Single source of truth for which basemap loads on first paint. */
export const DEFAULT_BASEMAP_ID = "osm";
