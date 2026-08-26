import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import type Feature from "ol/Feature";
import type { LicenceFeatureCollection } from "@/lib/types";

const format = new GeoJSON({ featureProjection: "EPSG:3857", dataProjection: "EPSG:4326" });

export function createLicenceLayer() {
  const source = new VectorSource();
  const layer = new VectorLayer({ source, properties: { id: "licences" } });
  const featuresById = new Map<string, Feature>();

  /** Populates the layer from GeoJSON already fetched elsewhere (the shared `useLicences()` cache) — this layer no longer fetches on its own. */
  function setData(geojson: LicenceFeatureCollection) {
    const features = format.readFeatures(geojson) as Feature[];
    source.clear();
    featuresById.clear();
    for (const feature of features) {
      const id = feature.get("id") as string | undefined;
      if (id) featuresById.set(id, feature);
    }
    source.addFeatures(features);
  }

  /** O(1) lookup used for per-feature hover restyling instead of scanning the whole source. */
  function getFeatureById(id: string): Feature | null {
    return featuresById.get(id) ?? null;
  }

  return { layer, source, setData, getFeatureById };
}
