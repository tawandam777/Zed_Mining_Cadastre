"use client";

import { useMapStore } from "@/store/useMapStore";
import { formatCoordinate } from "@/lib/crs";

export function CoordinateReadout() {
  const mousePosition = useMapStore((s) => s.mousePosition);
  const coordFormat = useMapStore((s) => s.coordFormat);

  const text = mousePosition
    ? formatCoordinate(mousePosition[0], mousePosition[1], coordFormat)
    : "Move over map for coordinates";

  return (
    <div className="border-brand-field-border bg-brand-field min-w-[190px] rounded-md border px-2.5 py-1 text-center font-mono text-[11.5px] text-slate-200">
      {text}
    </div>
  );
}
