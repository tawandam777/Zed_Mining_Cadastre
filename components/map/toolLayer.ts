import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { LineString, Point, Polygon } from "ol/geom";
import { fromLonLat } from "ol/proj";
import * as turf from "@turf/turf";
import { toolOverlayStyle } from "./styles";
import type { SpatialTool } from "@/store/useMapStore";

type LonLat = [number, number];

function toMap(points: LonLat[]) {
  return points.map((p) => fromLonLat(p));
}

export interface ToolOverlayState {
  tool: SpatialTool | null;
  points: LonLat[];
  bufferCenter: LonLat | null;
  bufferRadiusKm: number;
  previewPoint: LonLat | null;
}

export function createToolLayer() {
  const source = new VectorSource();
  const layer = new VectorLayer({ source, style: toolOverlayStyle, properties: { id: "tool-overlay" } });

  function update(state: ToolOverlayState) {
    source.clear();
    const { tool, points, bufferCenter, bufferRadiusKm, previewPoint } = state;
    if (!tool) return;

    const livePoints = previewPoint && !["buffer"].includes(tool) ? [...points, previewPoint] : points;

    if (tool === "measureDistance" && livePoints.length >= 2) {
      source.addFeature(new Feature({ geometry: new LineString(toMap(livePoints)) }));
    } else if (tool === "measureArea" && livePoints.length >= 3) {
      const ring = [...livePoints, livePoints[0]];
      source.addFeature(new Feature({ geometry: new Polygon([toMap(ring)]) }));
    } else if (tool === "selectPolygon" && livePoints.length >= 2) {
      const ring = livePoints.length >= 3 ? [...livePoints, livePoints[0]] : livePoints;
      source.addFeature(new Feature({ geometry: new Polygon([toMap(ring)]) }));
    } else if (tool === "selectRect" && points.length >= 1) {
      const [x1, y1] = points[0];
      const [x2, y2] = previewPoint ?? points[1] ?? points[0];
      const ring: LonLat[] = [
        [Math.min(x1, x2), Math.min(y1, y2)],
        [Math.max(x1, x2), Math.min(y1, y2)],
        [Math.max(x1, x2), Math.max(y1, y2)],
        [Math.min(x1, x2), Math.max(y1, y2)],
        [Math.min(x1, x2), Math.min(y1, y2)],
      ];
      source.addFeature(new Feature({ geometry: new Polygon([toMap(ring)]) }));
    } else if (tool === "selectCircle" && points.length >= 1) {
      const center = points[0];
      const edge = previewPoint ?? points[1] ?? center;
      const radiusKm = turf.distance(turf.point(center), turf.point(edge), { units: "kilometers" });
      if (radiusKm > 0) {
        const circle = turf.circle(center, radiusKm, { units: "kilometers", steps: 64 });
        const ring = circle.geometry.coordinates[0] as LonLat[];
        source.addFeature(new Feature({ geometry: new Polygon([toMap(ring)]) }));
      }
      source.addFeature(new Feature({ geometry: new Point(fromLonLat(center)) }));
    } else if (tool === "buffer" && bufferCenter) {
      const circle = turf.circle(bufferCenter, bufferRadiusKm, { units: "kilometers", steps: 64 });
      const ring = circle.geometry.coordinates[0] as LonLat[];
      source.addFeature(new Feature({ geometry: new Polygon([toMap(ring)]) }));
      source.addFeature(new Feature({ geometry: new Point(fromLonLat(bufferCenter)) }));
    }

    if ((tool === "measureDistance" || tool === "measureArea" || tool === "selectPolygon") && points.length > 0) {
      points.forEach((p) => source.addFeature(new Feature({ geometry: new Point(fromLonLat(p)) })));
    }
  }

  return { layer, source, update };
}
