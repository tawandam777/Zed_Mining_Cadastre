"use client";

import { Menu } from "lucide-react";
import { useMapStore } from "@/store/useMapStore";
import { STATUS_LIST, statusColor } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Compact status legend shown over the map when the left sidebar is collapsed, so the color key is never fully lost. */
export function FloatingLegend() {
  const leftOpen = useMapStore((s) => s.leftOpen);
  const activeTool = useMapStore((s) => s.activeTool);
  const toggleLeftPanel = useMapStore((s) => s.toggleLeftPanel);
  const statusVisibility = useMapStore((s) => s.statusVisibility);
  const toggleStatusVisibility = useMapStore((s) => s.toggleStatusVisibility);

  if (leftOpen) return null;

  return (
    <div
      className={cn(
        "border-border bg-popover animate-in fade-in slide-in-from-left-2 absolute top-84 left-3 z-10 w-32 rounded-md border p-2 shadow-md duration-200 sm:top-auto sm:bottom-16 sm:w-40 sm:p-2.5",
        // An active tool grows the toolbar by one button (the "clear" button), which on
        // mobile leaves no room between it and the bottom controls (scale bar/switcher) for
        // the legend too — there just isn't enough vertical space on a phone screen for all
        // of it at once. ToolStatusPanel is the relevant UI while a tool is active anyway, so
        // hide the legend on mobile only for that state rather than fight for a few more
        // pixels; it reappears the instant the tool is cleared.
        activeTool && "max-sm:hidden",
      )}
    >
      <div className="mb-1 flex items-center justify-between sm:mb-1.5">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">Legend</span>
        <button
          type="button"
          onClick={toggleLeftPanel}
          aria-label="Open layers panel"
          title="Open layers panel"
          className="hover:bg-accent rounded p-0.5 text-slate-500 dark:text-slate-300"
        >
          <Menu className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-0.5 sm:gap-1">
        {STATUS_LIST.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => toggleStatusVisibility(status)}
            className="flex items-center gap-1.5 text-left"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: statusColor(status), opacity: statusVisibility[status] ? 1 : 0.25 }}
            />
            <span
              className={cn(
                "text-[10.5px] sm:text-[11px]",
                statusVisibility[status]
                  ? "text-slate-700 dark:text-slate-200"
                  : "text-muted-foreground line-through",
              )}
            >
              {status}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
