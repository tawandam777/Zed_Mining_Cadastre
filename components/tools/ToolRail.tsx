"use client";

import {
  Ruler,
  Pentagon,
  Crosshair,
  CircleDot,
  RectangleHorizontal,
  Hexagon,
  X,
} from "lucide-react";
import { useMapStore, type SpatialTool } from "@/store/useMapStore";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const TOOLS: { id: SpatialTool; label: string; icon: typeof Ruler }[] = [
  { id: "measureDistance", label: "Measure distance", icon: Ruler },
  { id: "measureArea", label: "Measure area", icon: Pentagon },
  { id: "identify", label: "Identify feature", icon: Crosshair },
  { id: "buffer", label: "Buffer", icon: CircleDot },
  { id: "selectRect", label: "Select by rectangle", icon: RectangleHorizontal },
  { id: "selectCircle", label: "Select by circle", icon: CircleDot },
  { id: "selectPolygon", label: "Select by polygon", icon: Hexagon },
];

export function ToolRail() {
  const activeTool = useMapStore((s) => s.activeTool);
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const clearTool = useMapStore((s) => s.clearTool);
  const showToast = useMapStore((s) => s.showToast);

  function handleClear() {
    clearTool();
    showToast("Tool and selection cleared");
  }

  return (
    <div className="border-border bg-popover animate-in fade-in slide-in-from-left-2 absolute top-3 left-3 z-10 flex flex-col overflow-hidden rounded-md border shadow-md duration-200">
      {TOOLS.map(({ id, label, icon: Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => setActiveTool(id)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center border-b border-border last:border-b-0 sm:h-9 sm:w-9",
                  activeTool === id
                    ? "bg-brand-accent text-white"
                    : "hover:bg-accent text-slate-600 dark:text-slate-300",
                )}
              />
            }
          >
            <Icon className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      ))}
      {activeTool && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={handleClear}
                className="hover:bg-accent flex h-11 w-11 items-center justify-center text-slate-500 sm:h-9 sm:w-9 dark:text-slate-300"
              />
            }
          >
            <X className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="right">Clear tool & selection</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
