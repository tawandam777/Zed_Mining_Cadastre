"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useMapStore } from "@/store/useMapStore";
import { useMapApi } from "@/components/map/MapContext";
import { statusColor } from "@/lib/theme";
import { boundingBox } from "@/lib/geo";
import { useLicences } from "@/lib/useLicences";
import type { LicenceDetail, LicenceFeature } from "@/lib/types";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-muted-foreground text-[10.5px] tracking-wide uppercase">{label}</div>
      <div className="text-[12.5px] text-slate-800 dark:text-slate-100">{value ?? "—"}</div>
    </div>
  );
}

export function RightPanel() {
  const selectedLicenceId = useMapStore((s) => s.selectedLicenceId);
  const toolSelectionIds = useMapStore((s) => s.toolSelectionIds);
  const selectLicence = useMapStore((s) => s.selectLicence);
  const clearTool = useMapStore((s) => s.clearTool);
  const showToast = useMapStore((s) => s.showToast);
  const { zoomToExtentLonLat } = useMapApi();
  const [detail, setDetail] = useState<LicenceDetail | null>(null);
  const allLicences = useLicences();

  useEffect(() => {
    if (!selectedLicenceId) return;
    let cancelled = false;
    fetch(`/api/licences/${selectedLicenceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLicenceId]);

  const multiFeatures = useMemo<LicenceFeature[]>(() => {
    if (!allLicences || selectedLicenceId || toolSelectionIds.length === 0) return [];
    return allLicences.features.filter((f) => toolSelectionIds.includes(f.properties.id));
  }, [allLicences, selectedLicenceId, toolSelectionIds]);

  function handleZoomToDetail() {
    if (!detail) return;
    const geometry = detail.geometry;
    if (geometry.type === "MultiPolygon" || geometry.type === "Polygon") {
      const coords =
        geometry.type === "MultiPolygon"
          ? (geometry.coordinates[0][0] as [number, number][])
          : (geometry.coordinates[0] as [number, number][]);
      zoomToExtentLonLat(boundingBox(coords));
    }
  }

  if (selectedLicenceId && detail && detail.id === selectedLicenceId) {
    const centroid = detail.centroid.coordinates as [number, number];
    return (
      <div className="border-border bg-card animate-in fade-in slide-in-from-right-4 flex w-80 min-w-80 flex-col border-l duration-200">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <span className="text-[13px] font-semibold">Licence Detail</span>
          <button type="button" onClick={() => selectLicence(null)} aria-label="Close">
            <X className="text-muted-foreground h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <div>
            <div className="font-mono text-[13px] font-semibold">{detail.licenceNumber}</div>
            <span
              className="mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
              style={{ background: statusColor(detail.status) }}
            >
              {detail.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner" value={detail.owner} />
            <Field label="Commodity" value={detail.commodity} />
            <Field label="Licence Type" value={detail.licenceType} />
            <Field label="Province" value={detail.province} />
            <Field label="Area" value={detail.areaHa ? `${detail.areaHa} ha` : null} />
            <Field label="Area (survey)" value={`${detail.areaSqKm.toFixed(2)} km²`} />
            <Field label="Issue Date" value={detail.issueDate} />
            <Field label="Expiry Date" value={detail.expiryDate} />
          </div>

          <div className="border-border border-t pt-3">
            <div className="text-muted-foreground mb-1 text-[10.5px] tracking-wide uppercase">
              Geometry Statistics
            </div>
            <Field label="Perimeter" value={`${detail.perimeterKm.toFixed(2)} km`} />
            <div className="mt-2">
              <Field label="Centroid (lon, lat)" value={`${centroid[0].toFixed(5)}, ${centroid[1].toFixed(5)}`} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleZoomToDetail}
            className="bg-brand-accent hover:bg-brand-accent-hover rounded-md py-2 text-center text-[12.5px] font-medium text-white"
          >
            Zoom to Feature
          </button>
        </div>
      </div>
    );
  }

  if (multiFeatures.length > 0) {
    return (
      <div className="border-border bg-card animate-in fade-in slide-in-from-right-4 flex w-80 min-w-80 flex-col border-l duration-200">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <span className="text-[13px] font-semibold">Selection ({multiFeatures.length})</span>
          <button
            type="button"
            onClick={() => {
              clearTool();
              showToast("Selection cleared");
            }}
            aria-label="Clear selection"
          >
            <X className="text-muted-foreground h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1.5 overflow-y-auto p-3">
          {multiFeatures.map((f) => (
            <button
              key={f.properties.id}
              type="button"
              onClick={() => selectLicence(f.properties.id)}
              className="border-border hover:bg-accent rounded-md border px-2.5 py-2 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11.5px] font-semibold">{f.properties.licenceNumber}</span>
                <span
                  className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white"
                  style={{ background: statusColor(f.properties.status) }}
                >
                  {f.properties.status}
                </span>
              </div>
              <div className="text-muted-foreground text-[10.5px]">
                {f.properties.owner} · {f.properties.areaHa} ha
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
