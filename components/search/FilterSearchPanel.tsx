"use client";

import { useMemo } from "react";
import { useMapStore } from "@/store/useMapStore";
import { useMapApi } from "@/components/map/MapContext";
import { statusColor, STATUS_LIST } from "@/lib/theme";
import { boundingBox } from "@/lib/geo";
import { useLicences } from "@/lib/useLicences";
import type { LicenceFeature } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FilterSearchPanel() {
  const data = useLicences();
  const searchQuery = useMapStore((s) => s.searchQuery);
  const setSearchQuery = useMapStore((s) => s.setSearchQuery);
  const filterCommodity = useMapStore((s) => s.filterCommodity);
  const setFilterCommodity = useMapStore((s) => s.setFilterCommodity);
  const filterStatus = useMapStore((s) => s.filterStatus);
  const setFilterStatus = useMapStore((s) => s.setFilterStatus);
  const filterProvince = useMapStore((s) => s.filterProvince);
  const setFilterProvince = useMapStore((s) => s.setFilterProvince);
  const selectLicence = useMapStore((s) => s.selectLicence);
  const flashLicence = useMapStore((s) => s.flashLicence);
  const { zoomToExtentLonLat } = useMapApi();

  const { commodities, provinces } = useMemo(() => {
    if (!data) return { commodities: [], provinces: [] };
    const commoditySet = new Set<string>();
    const provinceSet = new Set<string>();
    for (const f of data.features) {
      commoditySet.add(f.properties.commodity);
      if (f.properties.province) provinceSet.add(f.properties.province);
    }
    return { commodities: [...commoditySet].sort(), provinces: [...provinceSet].sort() };
  }, [data]);

  const results = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.features.filter((f) => {
      const p = f.properties;
      if (filterCommodity !== "All" && p.commodity !== filterCommodity) return false;
      if (filterStatus !== "All" && p.status !== filterStatus) return false;
      if (filterProvince !== "All" && p.province !== filterProvince) return false;
      if (!q) return true;
      return (
        p.licenceNumber.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.commodity.toLowerCase().includes(q) ||
        (p.province ?? "").toLowerCase().includes(q) ||
        p.licenceType.toLowerCase().includes(q) ||
        String(p.areaHa ?? "").includes(q)
      );
    });
  }, [data, searchQuery, filterCommodity, filterStatus, filterProvince]);

  function handleSelect(f: LicenceFeature) {
    selectLicence(f.properties.id);
    const geometry = f.geometry;
    if (geometry.type === "MultiPolygon" || geometry.type === "Polygon") {
      const coords =
        geometry.type === "MultiPolygon"
          ? (geometry.coordinates[0][0] as [number, number][])
          : (geometry.coordinates[0] as [number, number][]);
      zoomToExtentLonLat(boundingBox(coords));
    }
    flashLicence(f.properties.id);
    setTimeout(() => flashLicence(null), 1200);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search licence number, owner…"
        className="border-border mb-3 h-8 w-full rounded-md border px-2.5 text-[12.5px] focus:outline-none"
      />

      <div className="mb-3 flex flex-col gap-2">
        <div>
          <div className="text-muted-foreground mb-1 text-[10.5px]">Commodity</div>
          <Select value={filterCommodity} onValueChange={(v) => setFilterCommodity(v ?? "All")}>
            <SelectTrigger className="h-8 w-full text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {commodities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-muted-foreground mb-1 text-[10.5px]">Status</div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "All")}>
            <SelectTrigger className="h-8 w-full text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {STATUS_LIST.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-muted-foreground mb-1 text-[10.5px]">Province</div>
          <Select value={filterProvince} onValueChange={(v) => setFilterProvince(v ?? "All")}>
            <SelectTrigger className="h-8 w-full text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-border mb-1.5 flex items-center justify-between border-t pt-2">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Results</span>
        <span className="text-muted-foreground font-mono text-[11px]">
          {results.length} / {data?.features.length ?? 0}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {results.length === 0 && (
          <div className="text-muted-foreground py-6 text-center text-xs">No licences match these filters.</div>
        )}
        {results.map((f) => (
          <button
            key={f.properties.id}
            type="button"
            onClick={() => handleSelect(f)}
            className="border-border hover:border-muted-foreground hover:bg-accent rounded-[7px] border px-2.5 py-2 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11.5px] font-semibold">{f.properties.licenceNumber}</span>
              <span
                className="ml-auto rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold text-white"
                style={{ background: statusColor(f.properties.status) }}
              >
                {f.properties.status}
              </span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-slate-600 dark:text-slate-300">{f.properties.owner}</div>
            <div className="text-muted-foreground mt-0.5 text-[10.5px]">
              {f.properties.commodity} · {f.properties.province} · {f.properties.areaHa} ha
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
