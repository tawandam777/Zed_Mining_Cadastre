"use client";

import { useMapStore, type LeftTab } from "@/store/useMapStore";
import { LayerTree } from "@/components/layers/LayerTree";
import { FilterSearchPanel } from "@/components/search/FilterSearchPanel";
import { cn } from "@/lib/utils";

const TABS: { id: LeftTab; label: string }[] = [
  { id: "layers", label: "Layers" },
  { id: "search", label: "Search" },
];

export function LeftPanel() {
  const leftOpen = useMapStore((s) => s.leftOpen);
  const leftTab = useMapStore((s) => s.leftTab);
  const setLeftTab = useMapStore((s) => s.setLeftTab);

  if (!leftOpen) return null;

  return (
    <div className="border-border bg-slate-100 dark:bg-card animate-in fade-in slide-in-from-left-4 flex w-[308px] min-w-[308px] flex-col border-r duration-200">
      <div className="border-border flex border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setLeftTab(tab.id)}
            className={cn(
              "flex-1 border-b-2 py-3 text-center text-[12.5px] font-semibold",
              leftTab === tab.id
                ? "border-brand-accent text-brand-navy dark:text-white"
                : "text-muted-foreground border-transparent",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {leftTab === "layers" && <LayerTree />}
        {leftTab === "search" && <FilterSearchPanel />}
      </div>
    </div>
  );
}
