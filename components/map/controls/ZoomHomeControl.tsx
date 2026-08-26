"use client";

import { Minus, Plus, Home } from "lucide-react";
import { useMapApi } from "@/components/map/MapContext";

export function ZoomHomeControl() {
  const { zoomIn, zoomOut, resetHome } = useMapApi();

  return (
    <div className="border-border bg-popover absolute top-14 right-3 z-10 flex flex-col overflow-hidden rounded-md border shadow-md">
      <button
        type="button"
        onClick={zoomIn}
        aria-label="Zoom in"
        className="hover:bg-accent flex h-8 w-8 items-center justify-center border-b border-border"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={zoomOut}
        aria-label="Zoom out"
        className="hover:bg-accent flex h-8 w-8 items-center justify-center border-b border-border"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={resetHome}
        aria-label="Reset to home extent"
        className="hover:bg-accent flex h-8 w-8 items-center justify-center"
      >
        <Home className="h-4 w-4" />
      </button>
    </div>
  );
}
