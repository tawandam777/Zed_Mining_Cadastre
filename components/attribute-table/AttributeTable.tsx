"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { ArrowUpDown, Download, X } from "lucide-react";
import { useMapStore } from "@/store/useMapStore";
import { useMapApi } from "@/components/map/MapContext";
import { statusColor } from "@/lib/theme";
import { boundingBox } from "@/lib/geo";
import { useLicences } from "@/lib/useLicences";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LicenceFeature, LicenceFeatureCollection, LicenceProperties } from "@/lib/types";

const COLUMNS: { key: keyof LicenceProperties; label: string }[] = [
  { key: "licenceNumber", label: "Licence Number" },
  { key: "owner", label: "Owner" },
  { key: "commodity", label: "Commodity" },
  { key: "licenceType", label: "Type" },
  { key: "status", label: "Status" },
  { key: "province", label: "Province" },
  { key: "areaHa", label: "Area (ha)" },
  { key: "issueDate", label: "Issued" },
  { key: "expiryDate", label: "Expires" },
];

const PAGE_SIZE = 12;

export function AttributeTable() {
  const data = useLicences();
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<keyof LicenceProperties>("licenceNumber");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const toggleAttributeTable = useMapStore((s) => s.toggleAttributeTable);
  const selectLicence = useMapStore((s) => s.selectLicence);
  const showToast = useMapStore((s) => s.showToast);
  const { zoomToExtentLonLat } = useMapApi();

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    const rows = data.features.filter((f) => {
      if (!q) return true;
      return Object.values(f.properties).some((v) => String(v ?? "").toLowerCase().includes(q));
    });
    return [...rows].sort((a, b) => {
      const av = a.properties[sortKey];
      const bv = b.properties[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [data, filter, sortKey, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(key: keyof LicenceProperties) {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function handleRowClick(f: LicenceFeature) {
    selectLicence(f.properties.id);
    const geometry = f.geometry;
    if (geometry.type === "MultiPolygon" || geometry.type === "Polygon") {
      const coords =
        geometry.type === "MultiPolygon"
          ? (geometry.coordinates[0][0] as [number, number][])
          : (geometry.coordinates[0] as [number, number][]);
      zoomToExtentLonLat(boundingBox(coords));
    }
  }

  function downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const csv = Papa.unparse(filtered.map((f) => f.properties));
    downloadBlob(csv, "mining-licences.csv", "text/csv");
    showToast(`Exported ${filtered.length} row${filtered.length === 1 ? "" : "s"} to mining-licences.csv`);
  }

  function exportGeoJson() {
    const fc: LicenceFeatureCollection = { type: "FeatureCollection", features: filtered };
    downloadBlob(JSON.stringify(fc, null, 2), "mining-licences.geojson", "application/geo+json");
    showToast(`Exported ${filtered.length} feature${filtered.length === 1 ? "" : "s"} to mining-licences.geojson`);
  }

  return (
    <div className="border-border bg-card animate-in fade-in slide-in-from-bottom-4 flex h-72 min-h-72 flex-col border-t duration-200">
      <div className="border-border flex items-center gap-2 border-b px-2 py-2 sm:gap-3 sm:px-4">
        <span className="hidden text-[12.5px] font-semibold sm:inline">Attribute Table</span>
        <input
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          placeholder="Filter rows…"
          className="border-border h-7 min-w-0 flex-1 rounded-md border px-2 text-[12px] focus:outline-none sm:w-52 sm:flex-none"
        />
        <span className="text-muted-foreground hidden font-mono text-[11px] sm:inline">
          {filtered.length} row{filtered.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={exportCsv}
            title="Export CSV"
            className="border-border hover:bg-accent flex items-center gap-1 rounded-md border px-2 py-1 text-[11.5px]"
          >
            <Download className="h-3 w-3" /> <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            type="button"
            onClick={exportGeoJson}
            title="Export GeoJSON"
            className="border-border hover:bg-accent flex items-center gap-1 rounded-md border px-2 py-1 text-[11.5px]"
          >
            <Download className="h-3 w-3" /> <span className="hidden sm:inline">GeoJSON</span>
          </button>
          <button type="button" onClick={toggleAttributeTable} aria-label="Close attribute table">
            <X className="text-muted-foreground h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHead key={col.key} className="cursor-pointer select-none" onClick={() => toggleSort(col.key)}>
                  <span className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((f) => (
              <TableRow key={f.properties.id} className="hover:bg-accent cursor-pointer" onClick={() => handleRowClick(f)}>
                {COLUMNS.map((col) => (
                  <TableCell key={col.key} className="text-[12px]">
                    {col.key === "status" ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white"
                        style={{ background: statusColor(f.properties.status) }}
                      >
                        {f.properties.status}
                      </span>
                    ) : (
                      String(f.properties[col.key] ?? "—")
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="border-border flex items-center justify-end gap-2 border-t px-4 py-1.5 text-[11.5px]">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-muted-foreground">
          Page {page + 1} / {pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount - 1}
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          className="disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
