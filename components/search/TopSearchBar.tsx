"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useMapApi } from "@/components/map/MapContext";
import { useMapStore } from "@/store/useMapStore";
import { parseCoordinateInput } from "@/lib/coord-parse";
import { statusColor } from "@/lib/theme";
import { useLicences } from "@/lib/useLicences";
import type { LicenceProperties } from "@/lib/types";
import { boundingBox } from "@/lib/geo";

export function TopSearchBar() {
  const [query, setQuery] = useState("");
  const allLicences = useLicences();
  const [notice, setNotice] = useState<string | null>(null);
  const { zoomToLonLat, zoomToExtentLonLat } = useMapApi();
  const selectLicence = useMapStore((s) => s.selectLicence);
  const setMarkerPosition = useMapStore((s) => s.setMarkerPosition);
  const flashLicence = useMapStore((s) => s.flashLicence);
  const setSearchQuery = useMapStore((s) => s.setSearchQuery);
  const setLeftTab = useMapStore((s) => s.setLeftTab);
  const setLeftOpen = useMapStore((s) => s.setLeftOpen);

  const RESULT_LIMIT = 8;
  const allResults = useMemo(() => {
    if (!allLicences || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return allLicences.features.filter((f) => {
      const p = f.properties;
      return (
        p.licenceNumber.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.commodity.toLowerCase().includes(q) ||
        (p.province ?? "").toLowerCase().includes(q)
      );
    });
  }, [allLicences, query]);
  const results = allResults.slice(0, RESULT_LIMIT);

  function seeAllInSearchTab() {
    setSearchQuery(query);
    setLeftTab("search");
    setLeftOpen(true);
    setQuery("");
  }

  async function handleSubmit() {
    setNotice(null);
    const parsed = parseCoordinateInput(query);
    if (parsed) {
      setMarkerPosition([parsed.lon, parsed.lat]);
      zoomToLonLat(parsed.lon, parsed.lat, 13);
      try {
        const res = await fetch("/api/query/point", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lon: parsed.lon, lat: parsed.lat }),
        });
        const { licence } = await res.json();
        if (licence) {
          selectLicence(licence.id);
          flashLicence(licence.id);
          setTimeout(() => flashLicence(null), 1200);
        } else {
          selectLicence(null);
          setNotice("No mining licence exists at this location.");
        }
      } catch {
        setNotice("Coordinate lookup failed.");
      }
      return;
    }

    if (results.length > 0) {
      selectResult(results[0].properties, results[0].geometry);
    }
  }

  function selectResult(props: LicenceProperties, geometry: GeoJSON.Geometry) {
    selectLicence(props.id);
    setQuery("");
    if (geometry.type === "MultiPolygon" || geometry.type === "Polygon") {
      const coords =
        geometry.type === "MultiPolygon"
          ? (geometry.coordinates[0][0] as [number, number][])
          : (geometry.coordinates[0] as [number, number][]);
      zoomToExtentLonLat(boundingBox(coords));
    }
    flashLicence(props.id);
    setTimeout(() => flashLicence(null), 1200);
  }

  return (
    <div className="relative w-full min-w-0 max-w-[520px]">
      <div className="border-brand-field-border bg-brand-field flex h-[34px] min-w-0 items-center gap-2 rounded-full border px-4">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Search licence number, owner, commodity, or paste coordinates…"
          className="h-full w-full min-w-0 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-400 focus:outline-none"
        />
      </div>
      {results.length > 0 && query.trim().length >= 2 && (
        <div className="border-border bg-popover animate-in fade-in slide-in-from-top-1 absolute top-10 left-0 z-30 max-h-80 w-full overflow-y-auto rounded-md border shadow-lg duration-150">
          {results.map((f) => (
            <button
              key={f.properties.id}
              type="button"
              onClick={() => selectResult(f.properties, f.geometry)}
              className="hover:bg-accent flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11.5px] font-semibold">{f.properties.licenceNumber}</span>
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-[9.5px] font-semibold text-white"
                  style={{ background: statusColor(f.properties.status) }}
                >
                  {f.properties.status}
                </span>
              </div>
              <div className="text-muted-foreground text-[11.5px]">{f.properties.owner}</div>
              <div className="text-muted-foreground/70 text-[10.5px]">
                {f.properties.commodity} · {f.properties.province}
              </div>
            </button>
          ))}
          {allResults.length > RESULT_LIMIT && (
            <button
              type="button"
              onClick={seeAllInSearchTab}
              className="hover:bg-accent w-full px-3 py-2 text-left text-[11.5px] font-medium text-blue-600 dark:text-blue-400"
            >
              See all {allResults.length} results in Search tab →
            </button>
          )}
        </div>
      )}
      {notice && (
        <div className="border-border bg-popover animate-in fade-in slide-in-from-top-1 absolute top-10 left-0 z-30 w-full rounded-md border px-3 py-2 text-xs shadow-lg duration-150">
          {notice}
        </div>
      )}
    </div>
  );
}
