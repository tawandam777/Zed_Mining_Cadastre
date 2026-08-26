"use client";

import { useMapStore } from "@/store/useMapStore";
import { formatCoordinate } from "@/lib/crs";
import { formatScale } from "@/lib/scale";
import { useLicences } from "@/lib/useLicences";

export function StatusBar() {
  const mousePosition = useMapStore((s) => s.mousePosition);
  const coordFormat = useMapStore((s) => s.coordFormat);
  const currentScale = useMapStore((s) => s.currentScale);
  const currentZoom = useMapStore((s) => s.currentZoom);
  const selectedLicenceId = useMapStore((s) => s.selectedLicenceId);
  const toolSelectionIds = useMapStore((s) => s.toolSelectionIds);
  const licences = useLicences();
  const total = licences?.features.length ?? null;

  const selectedCount = toolSelectionIds.length || (selectedLicenceId ? 1 : 0);
  const coordText = mousePosition ? formatCoordinate(mousePosition[0], mousePosition[1], coordFormat) : "—";

  return (
    <div className="bg-brand-navy border-brand-navy-border dark:bg-card dark:border-border flex h-7 min-h-7 items-center gap-4 overflow-x-auto border-t px-4 font-mono text-[11px] whitespace-nowrap text-slate-400">
      <span>Lon/Lat: {coordText}</span>
      <span>CRS: EPSG:4326</span>
      <span>Scale {currentScale ? formatScale(currentScale) : "—"}</span>
      <span>Zoom ×{currentZoom !== null && currentZoom !== undefined ? currentZoom.toFixed(1) : "—"}</span>
      <span>Selected: {selectedCount}</span>
      <span className="ml-auto">{total ?? "…"} licences · Zambia</span>
    </div>
  );
}
