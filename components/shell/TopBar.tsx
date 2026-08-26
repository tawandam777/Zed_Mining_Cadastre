"use client";

import { type RefObject } from "react";
import { Menu, Maximize, Minimize, Table } from "lucide-react";
import { useMapStore } from "@/store/useMapStore";
import { TopSearchBar } from "@/components/search/TopSearchBar";
import { CoordinateReadout } from "@/components/map/controls/CoordinateReadout";
import { useFullscreen } from "@/lib/useFullscreen";
import type { CoordinateFormat } from "@/config/app.config";

const CRS_LABELS: Record<CoordinateFormat, string> = {
  dd: "EPSG:4326 · WGS 84",
  dms: "EPSG:4326 · DMS",
  utm: "UTM · WGS 84",
};

const CRS_LABELS_SHORT: Record<CoordinateFormat, string> = {
  dd: "DD",
  dms: "DMS",
  utm: "UTM",
};

export function TopBar({ shellRef }: { shellRef: RefObject<HTMLDivElement | null> }) {
  const toggleLeftPanel = useMapStore((s) => s.toggleLeftPanel);
  const theme = useMapStore((s) => s.theme);
  const toggleTheme = useMapStore((s) => s.toggleTheme);
  const coordFormat = useMapStore((s) => s.coordFormat);
  const setCoordFormat = useMapStore((s) => s.setCoordFormat);
  const toggleAttributeTable = useMapStore((s) => s.toggleAttributeTable);
  const attributeTableOpen = useMapStore((s) => s.attributeTableOpen);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(shellRef);

  function cycleCoordFormat() {
    const order: CoordinateFormat[] = ["dd", "dms", "utm"];
    setCoordFormat(order[(order.indexOf(coordFormat) + 1) % order.length]);
  }

  return (
    <div className="bg-brand-navy border-brand-navy-border dark:bg-card dark:border-border flex h-14 min-h-14 items-center gap-2 border-b px-4 shadow-sm sm:gap-4">
      <button
        type="button"
        onClick={toggleLeftPanel}
        aria-label="Toggle layer panel"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-white/10"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="flex shrink-0 items-center gap-2.5">
        <div className="bg-brand-amber h-[26px] w-[26px] shrink-0 rotate-45 rounded-md" />
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-slate-50">Mining Cadastre</div>
          <div className="hidden text-[11px] tracking-wide text-slate-400 uppercase sm:block">
            Zambia · Licence Map
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 justify-center">
        <TopSearchBar />
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="hidden lg:block">
          <CoordinateReadout />
        </div>
        <div className="border-brand-field-border bg-brand-field divide-brand-field-border flex h-[30px] items-center divide-x overflow-hidden rounded-md border">
          <button
            type="button"
            onClick={cycleCoordFormat}
            className="flex h-full items-center px-2.5 text-[11px] font-semibold text-blue-300 hover:bg-white/10"
            title="Click to cycle coordinate format"
          >
            <span className="hidden sm:inline">{CRS_LABELS[coordFormat]}</span>
            <span className="sm:hidden">{CRS_LABELS_SHORT[coordFormat]}</span>
          </button>
          <button
            type="button"
            onClick={toggleAttributeTable}
            aria-pressed={attributeTableOpen}
            className="flex h-full items-center gap-1.5 px-2.5 text-[11.5px] text-slate-300 hover:bg-white/10"
          >
            <Table className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Table</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-full items-center gap-1.5 px-2.5 text-[11.5px] text-slate-300 hover:bg-white/10"
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: theme === "light" ? "#FDE68A" : "#334155" }}
            />
            <span className="hidden sm:inline">{theme === "light" ? "Light" : "Dark"}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Toggle fullscreen"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-white/10"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
