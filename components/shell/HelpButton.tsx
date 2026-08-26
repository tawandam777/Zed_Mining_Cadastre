"use client";

import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SEEN_KEY = "mining-cadastre-help-seen";

/** Floating orientation popover for first-time users — opens itself once, then stays available as a "?" button. */
export function HelpButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Deferred a tick so the initial open state doesn't get set synchronously within the
    // effect body (matches the SSR-safe rehydrate pattern used for the persisted store).
    const timer = setTimeout(() => {
      try {
        if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
      } catch {
        // localStorage unavailable (private browsing, etc.) — just skip the auto-open.
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="absolute top-52 right-3 z-10 sm:top-40">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Help"
              title="Help"
              className="border-border bg-popover hover:bg-accent flex h-11 w-11 items-center justify-center rounded-md border text-slate-600 shadow-md sm:h-9 sm:w-9 dark:text-slate-300"
            />
          }
        >
          <HelpCircle className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent align="end">
          <div className="text-[12.5px] font-semibold">Getting started</div>
          <ul className="text-muted-foreground flex flex-col gap-1.5 text-[12px] leading-snug">
            <li>
              <strong className="text-foreground font-medium">Toolbar</strong> (top-left of the map) — measure,
              identify, buffer, and select-by-shape tools.
            </li>
            <li>
              <strong className="text-foreground font-medium">Search</strong> (top bar) — licence number, owner,
              commodity, or paste coordinates to jump there.
            </li>
            <li>
              <strong className="text-foreground font-medium">Layers</strong> (sidebar) — toggle boundaries and
              licence statuses, adjust opacity.
            </li>
            <li>Click any licence on the map to see its full details in the right panel.</li>
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
