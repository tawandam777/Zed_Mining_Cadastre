import type Projection from "ol/proj/Projection";

/** OGC-standard pixel size (0.28mm) used to convert a view resolution into a 1:N map scale denominator. */
const STANDARDIZED_PIXEL_SIZE_M = 0.00028;

export function computeScale(resolutionUnitsPerPixel: number, projection: Projection): number {
  const metersPerUnit = projection.getMetersPerUnit() ?? 1;
  return (resolutionUnitsPerPixel * metersPerUnit) / STANDARDIZED_PIXEL_SIZE_M;
}

export function formatScale(scale: number): string {
  return `1:${Math.round(scale).toLocaleString("en-US")}`;
}
