"use client";

import { useMapStore } from "@/store/useMapStore";
import { Slider } from "@/components/ui/slider";
import { lineLengthKm, polygonAreaKm2 } from "@/lib/geo";
import { X } from "lucide-react";

const INSTRUCTIONS: Record<string, (n: number, frozen: boolean) => string> = {
  measureDistance: (n) => (n < 2 ? "Click points on the map to measure a distance. Double-click to finish." : "Double-click to finish."),
  measureArea: (n) => (n < 3 ? "Click at least 3 points to trace an area. Double-click to finish." : "Double-click to finish."),
  identify: () => "Click a licence on the map to identify it.",
  buffer: (n, frozen) => (frozen ? "Adjust the radius to update the buffer selection." : "Click a point on the map to place the buffer center."),
  selectRect: (n) => (n === 0 ? "Click one corner, then click the opposite corner." : "Click the opposite corner to finish."),
  selectCircle: (n) => (n === 0 ? "Click the circle center, then click again to set the radius." : "Click again to set the radius."),
  selectPolygon: (n) => (n < 3 ? "Click points to trace a polygon. Double-click to finish." : "Double-click to finish."),
};

const TOOL_LABELS: Record<string, string> = {
  measureDistance: "Measure Distance",
  measureArea: "Measure Area",
  identify: "Identify Feature",
  buffer: "Buffer",
  selectRect: "Select by Rectangle",
  selectCircle: "Select by Circle",
  selectPolygon: "Select by Polygon",
};

function sliderValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

/** Floating panel anchored next to the map's tool rail — all tool interaction lives on the toolbar itself. */
export function ToolStatusPanel() {
  const activeTool = useMapStore((s) => s.activeTool);
  const toolPoints = useMapStore((s) => s.toolPoints);
  const toolFrozen = useMapStore((s) => s.toolFrozen);
  const bufferRadiusKm = useMapStore((s) => s.bufferRadiusKm);
  const setBufferRadiusKm = useMapStore((s) => s.setBufferRadiusKm);
  const bufferCenter = useMapStore((s) => s.bufferCenter);
  const clearTool = useMapStore((s) => s.clearTool);

  if (!activeTool) return null;

  const measureText =
    activeTool === "measureDistance" && toolPoints.length >= 2
      ? `${lineLengthKm(toolPoints).toFixed(2)} km`
      : activeTool === "measureArea" && toolPoints.length >= 3
        ? `${polygonAreaKm2(toolPoints).toFixed(2)} km²`
        : null;

  return (
    <div className="border-border bg-popover animate-in fade-in zoom-in-95 absolute top-3 left-16 z-10 w-64 rounded-md border p-3 shadow-md duration-150">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wide uppercase">{TOOL_LABELS[activeTool]}</span>
        <button type="button" onClick={clearTool} aria-label="Clear tool" className="hover:bg-accent rounded p-0.5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {activeTool === "buffer" && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-muted-foreground w-12 text-[10.5px]">Radius</span>
          <Slider
            value={[bufferRadiusKm]}
            min={1}
            max={100}
            step={1}
            onValueChange={(v) => setBufferRadiusKm(sliderValue(v))}
            disabled={!bufferCenter}
          />
          <span className="w-11 text-right font-mono text-[11px]">{bufferRadiusKm} km</span>
        </div>
      )}

      <div className="bg-muted rounded-md px-2.5 py-2 text-[12px] leading-relaxed text-slate-700 dark:text-slate-200">
        {INSTRUCTIONS[activeTool]?.(toolPoints.length, toolFrozen)}
        {measureText && <div className="mt-1 font-mono font-semibold">{measureText}</div>}
      </div>
    </div>
  );
}
