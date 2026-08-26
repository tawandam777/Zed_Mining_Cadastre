import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";

const format = new GeoJSON({ featureProjection: "EPSG:3857", dataProjection: "EPSG:4326" });

interface AdminBoundariesResponse {
  national: GeoJSON.FeatureCollection;
  provinces: GeoJSON.FeatureCollection;
  districts: GeoJSON.FeatureCollection;
}

/** Three independent boundary layers (national / province / district), one shared fetch. */
export function createBoundaryLayers() {
  const nationalSource = new VectorSource();
  const provinceSource = new VectorSource();
  const districtSource = new VectorSource();

  const nationalLayer = new VectorLayer({ source: nationalSource, properties: { id: "boundary-national" } });
  const provinceLayer = new VectorLayer({ source: provinceSource, properties: { id: "boundary-provinces" } });
  const districtLayer = new VectorLayer({ source: districtSource, properties: { id: "boundary-districts" } });

  async function refresh() {
    const res = await fetch("/api/boundaries", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load boundaries: ${res.status}`);
    const data = (await res.json()) as AdminBoundariesResponse;

    nationalSource.clear();
    nationalSource.addFeatures(format.readFeatures(data.national));
    provinceSource.clear();
    provinceSource.addFeatures(format.readFeatures(data.provinces));
    districtSource.clear();
    districtSource.addFeatures(format.readFeatures(data.districts));
  }

  return { nationalLayer, provinceLayer, districtLayer, refresh };
}
