import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_BASEMAP_ID } from "@/config/basemaps";
import { DEFAULT_COORDINATE_FORMAT, type CoordinateFormat } from "@/config/app.config";
import { DEFAULT_STATUS_VISIBILITY, type LicenceStatus } from "@/lib/theme";

export type LeftTab = "layers" | "search";
export type SpatialTool =
  | "measureDistance"
  | "measureArea"
  | "identify"
  | "buffer"
  | "selectRect"
  | "selectCircle"
  | "selectPolygon";

export type LonLat = [number, number];

interface MapStoreState {
  // shell
  theme: "light" | "dark";
  leftOpen: boolean;
  leftTab: LeftTab;
  attributeTableOpen: boolean;
  toastMessage: string | null;

  // basemap / layers
  basemapId: string;
  showNationalBoundary: boolean;
  nationalBoundaryOpacity: number;
  showProvinceBoundaries: boolean;
  provinceBoundaryOpacity: number;
  showDistrictBoundaries: boolean;
  districtBoundaryOpacity: number;
  licenceOpacity: number;
  statusVisibility: Record<LicenceStatus, boolean>;

  // selection
  selectedLicenceId: string | null;
  hoveredLicenceId: string | null;
  toolSelectionIds: string[];
  flashLicenceId: string | null;

  // coordinate marker (from coordinate search)
  markerPosition: LonLat | null;

  // search
  searchQuery: string;
  filterCommodity: string;
  filterStatus: string;
  filterProvince: string;

  // tools
  activeTool: SpatialTool | null;
  toolPoints: LonLat[];
  toolFrozen: boolean;
  bufferCenter: LonLat | null;
  bufferRadiusKm: number;

  // display
  coordFormat: CoordinateFormat;
  mousePosition: LonLat | null;
  currentScale: number | null;
  currentZoom: number | null;

  // actions
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleLeftPanel: () => void;
  setLeftOpen: (open: boolean) => void;
  setLeftTab: (tab: LeftTab) => void;
  toggleAttributeTable: () => void;
  showToast: (message: string) => void;

  setBasemap: (id: string) => void;
  toggleNationalBoundary: () => void;
  setNationalBoundaryOpacity: (v: number) => void;
  toggleProvinceBoundaries: () => void;
  setProvinceBoundaryOpacity: (v: number) => void;
  toggleDistrictBoundaries: () => void;
  setDistrictBoundaryOpacity: (v: number) => void;
  setLicenceOpacity: (v: number) => void;
  toggleStatusVisibility: (status: LicenceStatus) => void;

  selectLicence: (id: string | null) => void;
  hoverLicence: (id: string | null) => void;
  setToolSelectionIds: (ids: string[]) => void;
  flashLicence: (id: string | null) => void;
  setMarkerPosition: (pos: LonLat | null) => void;

  setSearchQuery: (q: string) => void;
  setFilterCommodity: (v: string) => void;
  setFilterStatus: (v: string) => void;
  setFilterProvince: (v: string) => void;

  setActiveTool: (tool: SpatialTool | null) => void;
  addToolPoint: (pt: LonLat) => void;
  setToolFrozen: (v: boolean) => void;
  setBufferCenter: (pt: LonLat | null) => void;
  setBufferRadiusKm: (v: number) => void;
  clearTool: () => void;

  setCoordFormat: (f: CoordinateFormat) => void;
  setMousePosition: (pos: LonLat | null) => void;
  setViewInfo: (scale: number | null, zoom: number | null) => void;

  resetView: () => void;
}

/**
 * Layer settings (basemap, boundary visibility/opacity, licence opacity, status
 * visibility) persist across page reloads via localStorage — a refresh must not
 * silently revert the user's layer choices back to defaults. Everything else
 * (selection, active tool, search filters, map view/mouse position) intentionally
 * does NOT persist: a fresh page load always starts with a clean selection and,
 * since the map's initial view is always computed fresh (see MapCanvas/MapContext),
 * always recenters on the whole of Zambia — never a remembered pan/zoom position.
 */
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useMapStore = create<MapStoreState>()(
  persist(
    (set) => ({
      theme: "light",
      leftOpen: true,
      leftTab: "layers",
      attributeTableOpen: false,
      toastMessage: null,

      basemapId: DEFAULT_BASEMAP_ID,
      showNationalBoundary: true,
      nationalBoundaryOpacity: 1,
      showProvinceBoundaries: true,
      provinceBoundaryOpacity: 1,
      showDistrictBoundaries: true,
      districtBoundaryOpacity: 1,
      licenceOpacity: 1,
      statusVisibility: { ...DEFAULT_STATUS_VISIBILITY },

      selectedLicenceId: null,
      hoveredLicenceId: null,
      toolSelectionIds: [],
      flashLicenceId: null,
      markerPosition: null,

      searchQuery: "",
      filterCommodity: "All",
      filterStatus: "All",
      filterProvince: "All",

      activeTool: null,
      toolPoints: [],
      toolFrozen: false,
      bufferCenter: null,
      bufferRadiusKm: 10,

      coordFormat: DEFAULT_COORDINATE_FORMAT,
      mousePosition: null,
      currentScale: null,
      currentZoom: null,

      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      setTheme: (theme) => set({ theme }),
      toggleLeftPanel: () => set((s) => ({ leftOpen: !s.leftOpen })),
      setLeftOpen: (open) => set({ leftOpen: open }),
      setLeftTab: (tab) => set({ leftTab: tab }),
      toggleAttributeTable: () => set((s) => ({ attributeTableOpen: !s.attributeTableOpen })),
      showToast: (message) => {
        set({ toastMessage: message });
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => set({ toastMessage: null }), 2500);
      },

      setBasemap: (id) => set({ basemapId: id }),
      toggleNationalBoundary: () => set((s) => ({ showNationalBoundary: !s.showNationalBoundary })),
      setNationalBoundaryOpacity: (v) => set({ nationalBoundaryOpacity: v }),
      toggleProvinceBoundaries: () => set((s) => ({ showProvinceBoundaries: !s.showProvinceBoundaries })),
      setProvinceBoundaryOpacity: (v) => set({ provinceBoundaryOpacity: v }),
      toggleDistrictBoundaries: () => set((s) => ({ showDistrictBoundaries: !s.showDistrictBoundaries })),
      setDistrictBoundaryOpacity: (v) => set({ districtBoundaryOpacity: v }),
      setLicenceOpacity: (v) => set({ licenceOpacity: v }),
      toggleStatusVisibility: (status) =>
        set((s) => ({ statusVisibility: { ...s.statusVisibility, [status]: !s.statusVisibility[status] } })),

      selectLicence: (id) => set({ selectedLicenceId: id, toolSelectionIds: [] }),
      hoverLicence: (id) => set({ hoveredLicenceId: id }),
      setToolSelectionIds: (ids) => set({ toolSelectionIds: ids, selectedLicenceId: null }),
      flashLicence: (id) => set({ flashLicenceId: id }),
      setMarkerPosition: (pos) => set({ markerPosition: pos }),

      setSearchQuery: (q) => set({ searchQuery: q }),
      setFilterCommodity: (v) => set({ filterCommodity: v }),
      setFilterStatus: (v) => set({ filterStatus: v }),
      setFilterProvince: (v) => set({ filterProvince: v }),

      setActiveTool: (tool) =>
        set((s) => ({
          activeTool: s.activeTool === tool ? null : tool,
          toolPoints: [],
          toolSelectionIds: [],
          bufferCenter: null,
          toolFrozen: false,
          selectedLicenceId: null,
        })),
      addToolPoint: (pt) => set((s) => ({ toolPoints: [...s.toolPoints, pt] })),
      setToolFrozen: (v) => set({ toolFrozen: v }),
      setBufferCenter: (pt) => set({ bufferCenter: pt }),
      setBufferRadiusKm: (v) => set({ bufferRadiusKm: v }),
      clearTool: () =>
        set({ activeTool: null, toolPoints: [], toolSelectionIds: [], bufferCenter: null, toolFrozen: false }),

      setCoordFormat: (f) => set({ coordFormat: f }),
      setMousePosition: (pos) => set({ mousePosition: pos }),
      setViewInfo: (scale, zoom) => set({ currentScale: scale, currentZoom: zoom }),

      resetView: () =>
        set({
          selectedLicenceId: null,
          toolSelectionIds: [],
          activeTool: null,
          toolPoints: [],
          bufferCenter: null,
          toolFrozen: false,
          markerPosition: null,
        }),
    }),
    {
      name: "mining-cadastre-layer-settings",
      storage: createJSONStorage(() => localStorage),
      // SSR-safe: don't read localStorage during the initial render (server or client),
      // only after mount (see AppShell's rehydrate call) — avoids a hydration mismatch.
      skipHydration: true,
      partialize: (state) => ({
        basemapId: state.basemapId,
        showNationalBoundary: state.showNationalBoundary,
        nationalBoundaryOpacity: state.nationalBoundaryOpacity,
        showProvinceBoundaries: state.showProvinceBoundaries,
        provinceBoundaryOpacity: state.provinceBoundaryOpacity,
        showDistrictBoundaries: state.showDistrictBoundaries,
        districtBoundaryOpacity: state.districtBoundaryOpacity,
        licenceOpacity: state.licenceOpacity,
        statusVisibility: state.statusVisibility,
      }),
    },
  ),
);
