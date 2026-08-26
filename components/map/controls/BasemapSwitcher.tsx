"use client";

import { availableBasemaps } from "@/config/basemaps";
import { useMapStore } from "@/store/useMapStore";
import { cn } from "@/lib/utils";

export function BasemapSwitcher() {
  const basemapId = useMapStore((s) => s.basemapId);
  const setBasemap = useMapStore((s) => s.setBasemap);
  const basemaps = availableBasemaps();

  return (
    <div className="border-border bg-popover absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border p-1 shadow-md">
      {basemaps.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => setBasemap(b.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium whitespace-nowrap",
            basemapId === b.id ? "bg-brand-accent text-white" : "text-muted-foreground hover:bg-accent",
          )}
        >
          <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ background: b.swatch }} />
          {b.label}
        </button>
      ))}
    </div>
  );
}
