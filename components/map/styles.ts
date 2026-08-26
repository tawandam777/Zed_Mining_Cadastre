import { Circle, Fill, Stroke, Style, Text } from "ol/style";
import type { FeatureLike } from "ol/Feature";
import { statusColor } from "@/lib/theme";

export interface LicenceStyleOptions {
  opacity: number;
  hoveredId: string | null;
  selectedId: string | null;
  toolSelectionIds: string[];
  flashId: string | null;
  showLabels: boolean;
  statusVisibility: Record<string, boolean>;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function licenceStyleFunction(options: LicenceStyleOptions) {
  return (feature: FeatureLike): Style | undefined => {
    const id = feature.get("id") as string;
    const status = feature.get("status") as string;
    if (options.statusVisibility[status] === false) return undefined;
    const color = statusColor(status);
    const isHovered = id === options.hoveredId;
    const isSelected = id === options.selectedId;
    const isToolSelected = options.toolSelectionIds.includes(id);
    const isFlashing = id === options.flashId;
    const emphasised = isHovered || isSelected || isToolSelected || isFlashing;

    // Hover/select/flash all darken the outline to navy (matches the reference design's
    // hover-highlight behaviour); selected/tool-selected/flashing get a thicker outline
    // than a plain hover to keep the two states visually distinct.
    const strokeWidth = isSelected || isToolSelected || isFlashing ? 3 : isHovered ? 2 : 1.25;

    return new Style({
      fill: new Fill({ color: hexToRgba(color, isHovered ? Math.min(options.opacity + 0.1, 1) : options.opacity) }),
      stroke: new Stroke({
        color: emphasised ? "#0F2A43" : color,
        width: strokeWidth,
      }),
      text: options.showLabels
        ? new Text({
            text: feature.get("licenceNumber") as string,
            font: "600 11px 'IBM Plex Mono', monospace",
            fill: new Fill({ color: "#1E293B" }),
            stroke: new Stroke({ color: "#FFFFFF", width: 3 }),
            overflow: true,
          })
        : undefined,
    });
  };
}

export function nationalBoundaryStyle(opacity: number): Style {
  return new Style({
    fill: new Fill({ color: `rgba(199, 210, 221, ${0.25 * opacity})` }),
    stroke: new Stroke({ color: `rgba(51, 65, 85, ${opacity})`, width: 2 }),
  });
}

export function provinceBoundaryStyle(opacity: number): Style {
  return new Style({
    stroke: new Stroke({ color: `rgba(106, 90, 120, ${0.75 * opacity})`, width: 1.25, lineDash: [5, 3] }),
  });
}

export function districtBoundaryStyle(opacity: number): Style {
  return new Style({
    stroke: new Stroke({ color: `rgba(148, 163, 184, ${0.8 * opacity})`, width: 0.75, lineDash: [2, 2] }),
  });
}

export const markerStyle = new Style({
  image: new Circle({
    radius: 8,
    fill: new Fill({ color: "#D97706" }),
    stroke: new Stroke({ color: "#FFFFFF", width: 2 }),
  }),
});

export const toolOverlayStyle = new Style({
  stroke: new Stroke({ color: "#0F2A43", width: 2, lineDash: [6, 4] }),
  fill: new Fill({ color: "rgba(29, 78, 137, 0.12)" }),
  image: new Circle({ radius: 4, fill: new Fill({ color: "#0F2A43" }) }),
});
