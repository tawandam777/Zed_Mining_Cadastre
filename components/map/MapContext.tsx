"use client";

import { createContext, useContext, useMemo, useRef, type ReactNode, type RefObject } from "react";
import type Map from "ol/Map";
import { fromLonLat } from "ol/proj";
import { HOME_EXTENT_LONLAT } from "@/config/app.config";

export interface MapApi {
  mapRef: RefObject<Map | null>;
  zoomIn: () => void;
  zoomOut: () => void;
  resetHome: () => void;
  zoomToLonLat: (lon: number, lat: number, zoom?: number) => void;
  zoomToExtentLonLat: (extent: [number, number, number, number], padding?: number[]) => void;
  rotateToNorth: () => void;
}

const MapContext = createContext<MapApi | null>(null);

export function useMapApi(): MapApi {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("useMapApi must be used within <MapProvider>");
  return ctx;
}

export function MapProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<Map | null>(null);

  const api = useMemo<MapApi>(
    () => ({
      mapRef,
      zoomIn: () => {
        const view = mapRef.current?.getView();
        if (!view) return;
        const zoom = view.getZoom();
        if (zoom !== undefined) view.animate({ zoom: zoom + 1, duration: 200 });
      },
      zoomOut: () => {
        const view = mapRef.current?.getView();
        if (!view) return;
        const zoom = view.getZoom();
        if (zoom !== undefined) view.animate({ zoom: zoom - 1, duration: 200 });
      },
      resetHome: () => {
        const map = mapRef.current;
        const view = map?.getView();
        if (!map || !view) return;
        const extent = [
          ...fromLonLat([HOME_EXTENT_LONLAT[0], HOME_EXTENT_LONLAT[1]]),
          ...fromLonLat([HOME_EXTENT_LONLAT[2], HOME_EXTENT_LONLAT[3]]),
        ] as [number, number, number, number];
        // Reset rotation *before* fit(), not after — OL's plain setters cancel any
        // in-flight view animation, so calling setRotation() right after fit() was
        // cancelling the fit's pan/zoom animation before it ever ran (the Home button
        // silently did nothing). view.fit() also needs the viewport's pixel size to
        // compute a resolution — unlike animate({zoom}), it won't infer this on its
        // own and would otherwise silently no-op without it.
        view.setRotation(0);
        view.fit(extent, { size: map.getSize(), duration: 300, padding: [40, 40, 40, 40] });
      },
      zoomToLonLat: (lon, lat, zoom = 12) => {
        const view = mapRef.current?.getView();
        if (!view) return;
        view.animate({ center: fromLonLat([lon, lat]), zoom, duration: 400 });
      },
      zoomToExtentLonLat: (extent, padding = [100, 100, 100, 100]) => {
        const view = mapRef.current?.getView();
        if (!view) return;
        const mapExtent = [...fromLonLat([extent[0], extent[1]]), ...fromLonLat([extent[2], extent[3]])] as [
          number,
          number,
          number,
          number,
        ];
        // maxZoom 15 (was 16) + wider padding (was 60px) so zooming to a single small licence
        // parcel (search result, "Zoom to Feature", etc.) leaves visible surrounding context
        // instead of filling the whole viewport with just that one polygon.
        view.fit(mapExtent, { duration: 400, padding, maxZoom: 15 });
      },
      rotateToNorth: () => {
        mapRef.current?.getView().animate({ rotation: 0, duration: 250 });
      },
    }),
    [],
  );

  return <MapContext.Provider value={api}>{children}</MapContext.Provider>;
}
