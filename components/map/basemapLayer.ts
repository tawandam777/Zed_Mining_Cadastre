import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { BASEMAPS } from "@/config/basemaps";

export function createBasemapLayer(id: string): TileLayer {
  const def = BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];
  return new TileLayer({
    source: new XYZ({
      url: def.url,
      attributions: def.attributions,
      maxZoom: def.maxZoom ?? 19,
      crossOrigin: "anonymous",
    }),
    properties: { basemapId: def.id },
  });
}
