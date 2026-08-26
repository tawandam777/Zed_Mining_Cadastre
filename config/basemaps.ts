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
  requiresEnv?: "NEXT_PUBLIC_GOOGLE_MAPS_KEY" | "NEXT_PUBLIC_MAPBOX_TOKEN";
  /** Swatch color shown in the layer tree before the tile loads. */
  swatch: string;
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

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
    id: "mapbox-streets",
    label: "Mapbox Streets",
    kind: "xyz",
    url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN ?? ""}`,
    attributions: "© Mapbox © OpenStreetMap",
    maxZoom: 22,
    requiresEnv: "NEXT_PUBLIC_MAPBOX_TOKEN",
    swatch: "#E7ECE0",
  },
  {
    id: "mapbox-satellite",
    label: "Mapbox Satellite",
    kind: "xyz",
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN ?? ""}`,
    attributions: "© Mapbox © OpenStreetMap © Maxar",
    maxZoom: 22,
    requiresEnv: "NEXT_PUBLIC_MAPBOX_TOKEN",
    swatch: "#16201B",
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

/**
 * Single source of truth for which basemap loads on first paint. Prefers Mapbox once a
 * token is configured — OpenStreetMap's raw tile server (tile.openstreetmap.org) is meant
 * for light/dev use only; its usage policy explicitly disallows production/bulk traffic and
 * will throttle or block it. Falls back to OSM so local dev keeps working without a token.
 */
export const DEFAULT_BASEMAP_ID = MAPBOX_TOKEN ? "mapbox-streets" : "osm";
