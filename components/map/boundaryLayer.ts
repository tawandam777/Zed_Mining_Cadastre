import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import type { AdminBoundariesGeoJSON } from "@/lib/data/types";

const format = new GeoJSON({ featureProjection: "EPSG:3857", dataProjection: "EPSG:4326" });

/** Three independent boundary layers (national / province / district), populated from GeoJSON already fetched elsewhere (the shared `useBoundaries()` cache) — this no longer fetches on its own. */
export function createBoundaryLayers() {
  const nationalSource = new VectorSource();
  const provinceSource = new VectorSource();
  const districtSource = new VectorSource();

  const nationalLayer = new VectorLayer({ source: nationalSource, properties: { id: "boundary-national" } });
  const provinceLayer = new VectorLayer({ source: provinceSource, properties: { id: "boundary-provinces" } });
  const districtLayer = new VectorLayer({ source: districtSource, properties: { id: "boundary-districts" } });

  function setData(data: AdminBoundariesGeoJSON) {
    nationalSource.clear();
    nationalSource.addFeatures(format.readFeatures(data.national));
    provinceSource.clear();
    provinceSource.addFeatures(format.readFeatures(data.provinces));
    districtSource.clear();
    districtSource.addFeatures(format.readFeatures(data.districts));
  }

  return { nationalLayer, provinceLayer, districtLayer, setData };
}
