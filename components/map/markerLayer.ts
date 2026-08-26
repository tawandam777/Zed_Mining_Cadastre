import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { markerStyle } from "./styles";

export function createMarkerLayer() {
  const source = new VectorSource();
  const layer = new VectorLayer({ source, style: markerStyle, properties: { id: "marker" } });

  function setPosition(lonLat: [number, number] | null) {
    source.clear();
    if (!lonLat) return;
    source.addFeature(new Feature({ geometry: new Point(fromLonLat(lonLat)) }));
  }

  return { layer, source, setPosition };
}
