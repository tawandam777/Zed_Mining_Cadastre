"use client";

import { useMemo } from "react";
import { useMapStore } from "@/store/useMapStore";
import { STATUS_LIST, statusColor, type LicenceStatus } from "@/lib/theme";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useLicences } from "@/lib/useLicences";

function sliderValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

export function LayerTree() {
  const licences = useLicences();
  const counts = useMemo(() => {
    const next: Partial<Record<LicenceStatus, number>> = {};
    for (const f of licences?.features ?? []) {
      next[f.properties.status] = (next[f.properties.status] ?? 0) + 1;
    }
    return next;
  }, [licences]);

  const showNationalBoundary = useMapStore((s) => s.showNationalBoundary);
  const toggleNationalBoundary = useMapStore((s) => s.toggleNationalBoundary);
  const nationalBoundaryOpacity = useMapStore((s) => s.nationalBoundaryOpacity);
  const setNationalBoundaryOpacity = useMapStore((s) => s.setNationalBoundaryOpacity);

  const showProvinceBoundaries = useMapStore((s) => s.showProvinceBoundaries);
  const toggleProvinceBoundaries = useMapStore((s) => s.toggleProvinceBoundaries);
  const provinceBoundaryOpacity = useMapStore((s) => s.provinceBoundaryOpacity);
  const setProvinceBoundaryOpacity = useMapStore((s) => s.setProvinceBoundaryOpacity);

  const showDistrictBoundaries = useMapStore((s) => s.showDistrictBoundaries);
  const toggleDistrictBoundaries = useMapStore((s) => s.toggleDistrictBoundaries);
  const districtBoundaryOpacity = useMapStore((s) => s.districtBoundaryOpacity);
  const setDistrictBoundaryOpacity = useMapStore((s) => s.setDistrictBoundaryOpacity);

  const licenceOpacity = useMapStore((s) => s.licenceOpacity);
  const setLicenceOpacity = useMapStore((s) => s.setLicenceOpacity);
  const statusVisibility = useMapStore((s) => s.statusVisibility);
  const toggleStatusVisibility = useMapStore((s) => s.toggleStatusVisibility);

  return (
    <div className="flex flex-col gap-6 p-4">
      <section>
        <h3 className="text-muted-foreground mb-2.5 text-[11px] font-semibold tracking-wide uppercase">
          Administrative
        </h3>

        <label className="mb-2 flex items-center gap-2">
          <Checkbox checked={showNationalBoundary} onCheckedChange={toggleNationalBoundary} />
          <span className="text-[12.5px] text-slate-700 dark:text-slate-200">Zambia Boundary</span>
        </label>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-muted-foreground w-11 text-[10.5px]">Opacity</span>
          <Slider
            value={[nationalBoundaryOpacity]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => setNationalBoundaryOpacity(sliderValue(v))}
          />
        </div>

        <label className="mb-2 flex items-center gap-2">
          <Checkbox checked={showProvinceBoundaries} onCheckedChange={toggleProvinceBoundaries} />
          <span className="text-[12.5px] text-slate-700 dark:text-slate-200">Province Boundaries</span>
        </label>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-muted-foreground w-11 text-[10.5px]">Opacity</span>
          <Slider
            value={[provinceBoundaryOpacity]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => setProvinceBoundaryOpacity(sliderValue(v))}
          />
        </div>

        <label className="mb-2 flex items-center gap-2">
          <Checkbox checked={showDistrictBoundaries} onCheckedChange={toggleDistrictBoundaries} />
          <span className="text-[12.5px] text-slate-700 dark:text-slate-200">District Boundaries</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-11 text-[10.5px]">Opacity</span>
          <Slider
            value={[districtBoundaryOpacity]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => setDistrictBoundaryOpacity(sliderValue(v))}
          />
        </div>
      </section>

      <section>
        <h3 className="text-muted-foreground mb-2.5 text-[11px] font-semibold tracking-wide uppercase">
          Mining Licences
        </h3>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-muted-foreground w-11 text-[10.5px]">Opacity</span>
          <Slider
            value={[licenceOpacity]}
            min={0.3}
            max={1}
            step={0.05}
            onValueChange={(v) => setLicenceOpacity(sliderValue(v))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          {STATUS_LIST.map((status) => (
            <label key={status} className="flex items-center gap-2">
              <Checkbox
                checked={statusVisibility[status]}
                onCheckedChange={() => toggleStatusVisibility(status)}
              />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor(status) }} />
              <span className="flex-1 text-[12.5px] text-slate-700 dark:text-slate-200">{status}</span>
              <span className="text-muted-foreground font-mono text-[11px]">{counts[status] ?? 0}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
