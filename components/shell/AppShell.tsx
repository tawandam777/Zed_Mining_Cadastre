"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { MapProvider } from "@/components/map/MapContext";
import { ZoomHomeControl } from "@/components/map/controls/ZoomHomeControl";
import { TopBar } from "@/components/shell/TopBar";
import { StatusBar } from "@/components/shell/StatusBar";
import { LeftPanel } from "@/components/shell/LeftPanel";
import { RightPanel } from "@/components/shell/RightPanel";
import { ToolRail } from "@/components/tools/ToolRail";
import { ToolStatusPanel } from "@/components/tools/ToolStatusPanel";
import { BasemapSwitcher } from "@/components/map/controls/BasemapSwitcher";
import { AttributeTable } from "@/components/attribute-table/AttributeTable";
import { FloatingLegend } from "@/components/layers/FloatingLegend";
import { HelpButton } from "@/components/shell/HelpButton";
import { Toaster } from "@/components/shell/Toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMapStore } from "@/store/useMapStore";
import { useLicences } from "@/lib/useLicences";
import { useBoundaries } from "@/lib/useBoundaries";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), { ssr: false });

export function AppShell() {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const selectedLicenceId = useMapStore((s) => s.selectedLicenceId);
  const toolSelectionIds = useMapStore((s) => s.toolSelectionIds);
  const attributeTableOpen = useMapStore((s) => s.attributeTableOpen);
  const theme = useMapStore((s) => s.theme);
  const setTheme = useMapStore((s) => s.setTheme);
  const setLeftOpen = useMapStore((s) => s.setLeftOpen);
  const licences = useLicences();
  const boundaries = useBoundaries();

  const rightPanelOpen = Boolean(selectedLicenceId) || toolSelectionIds.length > 0;
  const rehydratedRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Theme itself is intentionally not persisted (see the store's partialize comment), so
  // every fresh load otherwise defaults to light — seed it from the OS preference instead
  // of always forcing light on a system set to dark.
  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, [setTheme]);

  // Persisted layer settings (basemap, boundary/licence opacity, status visibility) are
  // read from localStorage only after mount — skipHydration on the store avoids a
  // server/client hydration mismatch (localStorage isn't available during SSR). leftOpen
  // isn't itself persisted, but the mobile-default-closed adjustment below has to wait for
  // rehydrate() to resolve first — it's async, and applying it before rehydrate finishes
  // risks whatever rehydrate's own merge does clobbering it back to the true default. Guarded
  // to run exactly once: React Strict Mode double-invokes effects in dev, and two concurrent
  // rehydrate() calls racing each other reintroduced the exact clobbering this was meant to
  // avoid — setLeftOpen(false) from the first call's resolution got stomped by the second.
  useEffect(() => {
    if (rehydratedRef.current) return;
    rehydratedRef.current = true;
    void Promise.resolve(useMapStore.persist.rehydrate()).then(() => {
      if (window.matchMedia("(max-width: 767px)").matches) setLeftOpen(false);
    });
  }, [setLeftOpen]);

  return (
    <TooltipProvider delay={300}>
      <MapProvider>
        <div ref={shellRef} className="bg-background flex h-full min-h-0 flex-1 flex-col">
          <TopBar shellRef={shellRef} />
          <div className="flex min-h-0 flex-1">
            <LeftPanel />
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <MapCanvas />
              <ToolRail />
              <ToolStatusPanel />
              <ZoomHomeControl />
              <BasemapSwitcher />
              <FloatingLegend />
              <HelpButton />
              <Toaster />
              {(!licences || !boundaries) && (
                <div className="border-border bg-popover pointer-events-none absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-md border px-4 py-2.5 shadow-md">
                  <span className="border-muted-foreground/30 border-t-brand-accent h-4 w-4 animate-spin rounded-full border-2" />
                  <span className="text-muted-foreground text-[12.5px]">
                    {!boundaries ? "Loading boundaries…" : "Loading licence data…"}
                  </span>
                </div>
              )}
            </div>
            {rightPanelOpen && <RightPanel />}
          </div>
          {attributeTableOpen && <AttributeTable />}
          <StatusBar />
        </div>
      </MapProvider>
    </TooltipProvider>
  );
}
