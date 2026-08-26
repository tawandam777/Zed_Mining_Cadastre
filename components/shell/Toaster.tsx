"use client";

import { useMapStore } from "@/store/useMapStore";

/** Small floating confirmation for actions that otherwise happen silently (exports, clearing a selection). */
export function Toaster() {
  const toastMessage = useMapStore((s) => s.toastMessage);

  if (!toastMessage) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center">
      <div className="border-border bg-popover animate-in fade-in slide-in-from-bottom-2 pointer-events-auto rounded-full border px-4 py-2 text-[12.5px] shadow-lg duration-200">
        {toastMessage}
      </div>
    </div>
  );
}
