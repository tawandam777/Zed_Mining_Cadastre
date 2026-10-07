"use client";

import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import type { Coordinate } from "ol/coordinate";
import View from "ol/View";
import ScaleLine from "ol/control/ScaleLine";
import OverviewMap from "ol/control/OverviewMap";
import Rotate from "ol/control/Rotate";
import { fromLonLat, toLonLat } from "ol/proj";
import { defaults as defaultInteractions } from "ol/interaction/defaults";
import { createBasemapLayer } from "./basemapLayer";
import { createLicenceLayer } from "./licenceLayer";
import { createBoundaryLayers } from "./boundaryLayer";
import { createMarkerLayer } from "./markerLayer";
import { createToolLayer } from "./toolLayer";
import { findSnapPoint } from "./snap";
import { licenceStyleFunction, nationalBoundaryStyle, provinceBoundaryStyle, districtBoundaryStyle } from "./styles";
import { useMapApi } from "./MapContext";
import { useMapStore, SKETCH_TOOLS } from "@/store/useMapStore";
import { useSpatialTools } from "@/components/tools/useSpatialTools";
import { computeLiveMeasurementText } from "@/components/tools/liveMeasurement";
import { HOME_EXTENT_LONLAT } from "@/config/app.config";
import { computeScale } from "@/lib/scale";
import { useLicences } from "@/lib/useLicences";
import { useBoundaries } from "@/lib/useBoundaries";

interface HoverInfo {
  x: number;
  y: number;
  licenceNumber: string;
  status: string;
  owner: string;
}

interface MeasureHud {
  x: number;
  y: number;
  text: string;
}

// Matches ol/interaction/Snap's own default — see snap.ts for why this is a plain function on
// the rAF-throttled pointermove path rather than that interaction.
const SNAP_PIXEL_TOLERANCE = 10;

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scaleBarRef = useRef<HTMLDivElement | null>(null);
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const compassRef = useRef<HTMLDivElement | null>(null);
  const { mapRef } = useMapApi();
  const { handleMapClick, handleDoubleClick } = useSpatialTools();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [measureHud, setMeasureHud] = useState<MeasureHud | null>(null);
  const licences = useLicences();
  const boundaries = useBoundaries();
  const prevHoveredIdRef = useRef<string | null>(null);

  const basemapId = useMapStore((s) => s.basemapId);
  const showNationalBoundary = useMapStore((s) => s.showNationalBoundary);
  const nationalBoundaryOpacity = useMapStore((s) => s.nationalBoundaryOpacity);
  const showProvinceBoundaries = useMapStore((s) => s.showProvinceBoundaries);
  const provinceBoundaryOpacity = useMapStore((s) => s.provinceBoundaryOpacity);
  const showDistrictBoundaries = useMapStore((s) => s.showDistrictBoundaries);
  const districtBoundaryOpacity = useMapStore((s) => s.districtBoundaryOpacity);
  const licenceOpacity = useMapStore((s) => s.licenceOpacity);
  const statusVisibility = useMapStore((s) => s.statusVisibility);
  const hoveredLicenceId = useMapStore((s) => s.hoveredLicenceId);
  const selectedLicenceId = useMapStore((s) => s.selectedLicenceId);
  const toolSelectionIds = useMapStore((s) => s.toolSelectionIds);
  const flashLicenceId = useMapStore((s) => s.flashLicenceId);
  const markerPosition = useMapStore((s) => s.markerPosition);
  const activeTool = useMapStore((s) => s.activeTool);
  const toolPoints = useMapStore((s) => s.toolPoints);
  const toolFrozen = useMapStore((s) => s.toolFrozen);
  const bufferCenter = useMapStore((s) => s.bufferCenter);
  const bufferRadiusKm = useMapStore((s) => s.bufferRadiusKm);
  const snapToVertices = useMapStore((s) => s.snapToVertices);
  const snapToEdges = useMapStore((s) => s.snapToEdges);

  const licenceLayerApi = useRef(createLicenceLayer());
  const boundaryLayersApi = useRef(createBoundaryLayers());
  const markerLayerApi = useRef(createMarkerLayer());
  const toolLayerApi = useRef(createToolLayer());
  // Current snapped point (lon/lat), recomputed every animation frame inside
  // processPointerMove — see snap.ts for why this isn't ol/interaction/Snap. A ref, not React
  // state, since it's written and read within the same throttled callback as everything else on
  // this hot path and doesn't need its own render.
  const snapPointRef = useRef<[number, number] | null>(null);

  // ---- create the map once ----
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const basemap = createBasemapLayer(basemapId);
    const { nationalLayer, provinceLayer, districtLayer } = boundaryLayersApi.current;
    const { layer: licenceLayer } = licenceLayerApi.current;
    const { layer: markerLayer } = markerLayerApi.current;
    const { layer: toolLayer } = toolLayerApi.current;

    const centerLon = (HOME_EXTENT_LONLAT[0] + HOME_EXTENT_LONLAT[2]) / 2;
    const centerLat = (HOME_EXTENT_LONLAT[1] + HOME_EXTENT_LONLAT[3]) / 2;

    const map = new Map({
      target: container,
      layers: [basemap, nationalLayer, provinceLayer, districtLayer, licenceLayer, toolLayer, markerLayer],
      view: new View({
        center: fromLonLat([centerLon, centerLat]),
        zoom: 6,
        minZoom: 3,
        maxZoom: 19,
      }),
      controls: [],
      interactions: defaultInteractions({ doubleClickZoom: true }),
    });

    const scaleLineControl = new ScaleLine({ target: scaleBarRef.current ?? undefined, units: "metric", bar: false });
    const overviewMapControl = new OverviewMap({
      target: overviewRef.current ?? undefined,
      collapsed: false,
      collapsible: false,
      layers: [createBasemapLayer(basemapId)],
    });
    const rotateControl = new Rotate({ target: compassRef.current ?? undefined, autoHide: false, label: "N" });
    map.addControl(scaleLineControl);
    map.addControl(overviewMapControl);
    map.addControl(rotateControl);

    mapRef.current = map;

    // Boundary and licence features come from the shared useBoundaries()/useLicences() caches
    // (see the effects below) rather than a separate fetch here — avoids double-fetching.

    const updateViewInfo = () => {
      const view = map.getView();
      const resolution = view.getResolution();
      const zoom = view.getZoom();
      if (resolution !== undefined) {
        useMapStore.getState().setViewInfo(computeScale(resolution, view.getProjection()), zoom ?? null);
      }
    };
    updateViewInfo();
    map.on("moveend", updateViewInfo);

    // Raw "pointermove" can fire far faster than the screen repaints (100-200+/sec on
    // high-poll-rate mice/trackpads). Doing turf math + OL geometry rebuilds + React
    // state updates on every single one of those backs up the main thread and makes
    // clicks feel delayed. Instead, stash only the latest event and do the real work
    // at most once per animation frame (~60/sec) — standard drag-interaction throttling.
    let pendingMoveEvent: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent> | null = null;
    let rafHandle: number | null = null;

    // Snap search itself lives in snap.ts (plain, synchronous, no OL Interaction involved — see
    // that file's header comment for why). This just gates it to sketch tools mid-sketch with at
    // least one of snapToVertices/snapToEdges on, and converts the pixel tolerance to map units
    // via the view's current resolution (the same conversion ol/interaction/Snap itself does).
    function computeSnap(coordinate: Coordinate) {
      const { activeTool: currentTool, toolFrozen: frozen, snapToVertices, snapToEdges } = useMapStore.getState();
      if (!currentTool || frozen || !SKETCH_TOOLS.includes(currentTool)) return null;
      if (!snapToVertices && !snapToEdges) return null;
      const resolution = map.getView().getResolution();
      if (!resolution) return null;
      return findSnapPoint(licenceLayerApi.current.source, coordinate, resolution * SNAP_PIXEL_TOLERANCE, {
        vertex: snapToVertices,
        edge: snapToEdges,
      });
    }

    function processPointerMove() {
      rafHandle = null;
      const evt = pendingMoveEvent;
      pendingMoveEvent = null;
      if (!evt) return;

      const snapped = computeSnap(evt.coordinate);
      const lonLat = toLonLat(snapped ?? evt.coordinate) as [number, number];
      snapPointRef.current = snapped ? lonLat : null;
      useMapStore.getState().setMousePosition(lonLat);

      const { activeTool: currentTool, toolFrozen: frozen } = useMapStore.getState();
      if (currentTool && !frozen) {
        const currentPoints = useMapStore.getState().toolPoints;
        toolLayerApi.current.update({
          tool: currentTool,
          points: currentPoints,
          bufferCenter: useMapStore.getState().bufferCenter,
          bufferRadiusKm: useMapStore.getState().bufferRadiusKm,
          previewPoint: lonLat,
          snapPoint: snapPointRef.current,
        });

        const liveText = computeLiveMeasurementText(currentTool, currentPoints, lonLat);
        setMeasureHud(liveText ? { x: evt.pixel[0], y: evt.pixel[1], text: liveText } : null);
      } else {
        setMeasureHud(null);
      }

      if (currentTool) {
        setHoverInfo(null);
        return;
      }

      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, { layerFilter: (l) => l === licenceLayer });
      if (feature) {
        useMapStore.getState().hoverLicence(feature.get("id") as string);
        setHoverInfo({
          x: evt.pixel[0],
          y: evt.pixel[1],
          licenceNumber: feature.get("licenceNumber"),
          status: feature.get("status"),
          owner: feature.get("owner"),
        });
      } else {
        useMapStore.getState().hoverLicence(null);
        setHoverInfo(null);
      }
    }

    map.on("pointermove", (evt) => {
      if (evt.dragging) return;
      pendingMoveEvent = evt;
      if (rafHandle === null) {
        rafHandle = requestAnimationFrame(processPointerMove);
      }
    });

    map.on("singleclick", (evt) => {
      const { activeTool: currentTool, toolFrozen: frozen } = useMapStore.getState();
      if (currentTool === "identify") {
        const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
          layerFilter: (l) => l === licenceLayer,
        });
        useMapStore.getState().selectLicence(feature ? (feature.get("id") as string) : null);
        return;
      }
      if (currentTool && !frozen) {
        const snapped = computeSnap(evt.coordinate);
        const lonLat = toLonLat(snapped ?? evt.coordinate) as [number, number];
        handleMapClick(lonLat);
        return;
      }
      if (currentTool) return;

      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
        layerFilter: (l) => l === licenceLayer,
      });
      useMapStore.getState().selectLicence(feature ? (feature.get("id") as string) : null);
    });

    map.on("dblclick", (evt) => {
      if (handleDoubleClick()) evt.stopPropagation();
    });

    const handleContainerMouseLeave = () => {
      if (rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
      pendingMoveEvent = null;
      setHoverInfo(null);
      setMeasureHud(null);
      useMapStore.getState().hoverLicence(null);
      useMapStore.getState().setMousePosition(null);
    };
    container.addEventListener("mouseleave", handleContainerMouseLeave);

    // QGIS-style digitizing shortcuts: Escape cancels the in-progress sketch (tool stays
    // active, ready for a new one), Backspace/Delete undoes the last placed vertex. Global
    // (not map-target-scoped) so they work regardless of DOM focus, but skipped while a form
    // field has focus so typing in the search bar or a filter input isn't hijacked.
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isFormField = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isFormField) return;
      const { activeTool: currentTool } = useMapStore.getState();
      if (!currentTool) return;
      if (e.key === "Escape") {
        useMapStore.getState().cancelSketch();
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        useMapStore.getState().undoToolPoint();
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
      container.removeEventListener("mouseleave", handleContainerMouseLeave);
      window.removeEventListener("keydown", handleKeyDown);
      // Controls with a custom `target` render into our own ref divs, not the
      // map's internal viewport — setTarget(undefined) alone won't remove them,
      // so remove each explicitly (triggers their setMap(null) DOM cleanup)
      // before tearing down the map. Otherwise a remount (Strict Mode in dev,
      // or any future re-render) leaves stale duplicate control elements behind.
      map.removeControl(scaleLineControl);
      map.removeControl(overviewMapControl);
      map.removeControl(rotateControl);
      map.setTarget(undefined);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- basemap swap ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers = map.getLayers();
    const oldBasemap = layers.item(0);
    const newBasemap = createBasemapLayer(basemapId);
    layers.setAt(0, newBasemap);
    oldBasemap?.dispose?.();
  }, [basemapId, mapRef]);

  // ---- licence data (loaded once via the shared useLicences() cache) ----
  useEffect(() => {
    if (licences) licenceLayerApi.current.setData(licences);
  }, [licences]);

  // ---- boundary data (loaded once via the shared useBoundaries() cache) ----
  useEffect(() => {
    if (boundaries) boundaryLayersApi.current.setData(boundaries);
  }, [boundaries]);

  // ---- licence styling (base pass — deliberately excludes hover) ----
  // Hover is handled by a separate, cheap per-feature effect below. If hover were included
  // here, every mouse move over a new feature would call layer.setStyle(), forcing OL to
  // re-invoke the style function (and allocate new Style/Fill/Stroke/Text objects) for every
  // visible feature, not just the one whose state changed. Fine at today's ~56 features, but
  // exactly the kind of full-layer-restyle-on-a-frequent-event pattern that reintroduces the
  // "tool interaction lag" bug class once the dataset grows.
  useEffect(() => {
    licenceLayerApi.current.layer.setOpacity(1);
    licenceLayerApi.current.layer.setStyle(
      licenceStyleFunction({
        opacity: licenceOpacity,
        hoveredId: null,
        selectedId: selectedLicenceId,
        toolSelectionIds,
        flashId: flashLicenceId,
        showLabels: true,
        statusVisibility,
      }),
    );
  }, [licenceOpacity, selectedLicenceId, toolSelectionIds, flashLicenceId, statusVisibility]);

  // ---- licence styling (hover pass — restyles only the 1-2 affected features) ----
  useEffect(() => {
    const { getFeatureById } = licenceLayerApi.current;
    const prevId = prevHoveredIdRef.current;

    // Falling back to the layer's own style function (rather than deleting the feature) keeps
    // this correct even if the un-hovered feature is still selected/tool-selected/flashing.
    if (prevId && prevId !== hoveredLicenceId) {
      getFeatureById(prevId)?.setStyle(undefined);
    }

    if (hoveredLicenceId) {
      const feature = getFeatureById(hoveredLicenceId);
      if (feature) {
        const styleFn = licenceStyleFunction({
          opacity: licenceOpacity,
          hoveredId: hoveredLicenceId,
          selectedId: selectedLicenceId,
          toolSelectionIds,
          flashId: flashLicenceId,
          showLabels: true,
          statusVisibility,
        });
        feature.setStyle(styleFn(feature));
      }
    }

    prevHoveredIdRef.current = hoveredLicenceId;
  }, [hoveredLicenceId, selectedLicenceId, toolSelectionIds, flashLicenceId, licenceOpacity, statusVisibility]);

  // ---- boundary styling / visibility (national / province / district, independently) ----
  useEffect(() => {
    const { nationalLayer } = boundaryLayersApi.current;
    nationalLayer.setVisible(showNationalBoundary);
    nationalLayer.setStyle(nationalBoundaryStyle(nationalBoundaryOpacity));
  }, [showNationalBoundary, nationalBoundaryOpacity]);

  useEffect(() => {
    const { provinceLayer } = boundaryLayersApi.current;
    provinceLayer.setVisible(showProvinceBoundaries);
    provinceLayer.setStyle(provinceBoundaryStyle(provinceBoundaryOpacity));
  }, [showProvinceBoundaries, provinceBoundaryOpacity]);

  useEffect(() => {
    const { districtLayer } = boundaryLayersApi.current;
    districtLayer.setVisible(showDistrictBoundaries);
    districtLayer.setStyle(districtBoundaryStyle(districtBoundaryOpacity));
  }, [showDistrictBoundaries, districtBoundaryOpacity]);

  // ---- marker ----
  useEffect(() => {
    markerLayerApi.current.setPosition(markerPosition);
  }, [markerPosition]);

  // ---- tool overlay (non-pointermove-driven refresh, e.g. clearing) ----
  // snapToVertices/snapToEdges are deps purely to force this to re-run and clear a stale ring
  // immediately if the user toggles one of the magnet buttons without moving the mouse
  // afterward — snapPointRef itself is only ever written inside processPointerMove, which won't
  // run again until the next real pointer move.
  useEffect(() => {
    snapPointRef.current = null;
    toolLayerApi.current.update({
      tool: activeTool,
      points: toolPoints,
      bufferCenter,
      bufferRadiusKm,
      previewPoint: null,
      snapPoint: null,
    });
  }, [activeTool, toolPoints, toolFrozen, bufferCenter, bufferRadiusKm, snapToVertices, snapToEdges]);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-slate-100">
      {hoverInfo && (
        <div
          className="border-border bg-popover text-popover-foreground pointer-events-none absolute z-20 rounded-md border px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12 }}
        >
          <div className="font-mono font-semibold">{hoverInfo.licenceNumber}</div>
          <div className="text-muted-foreground">
            {hoverInfo.owner} · {hoverInfo.status}
          </div>
        </div>
      )}
      {measureHud && activeTool && !toolFrozen && (
        <div
          data-testid="measure-hud"
          className="bg-brand-navy pointer-events-none absolute z-20 rounded-md px-2.5 py-1 font-mono text-xs font-semibold whitespace-nowrap text-white shadow-md"
          style={{ left: measureHud.x + 14, top: measureHud.y + 14 }}
        >
          {measureHud.text}
        </div>
      )}
      <div ref={scaleBarRef} className="absolute bottom-16 left-3 z-10 sm:bottom-8" />
      <div ref={overviewRef} className="ol-overview-slot absolute right-3 bottom-16 z-10 sm:bottom-3" />
      <div ref={compassRef} className="absolute top-3 right-3 z-10" />
    </div>
  );
}
