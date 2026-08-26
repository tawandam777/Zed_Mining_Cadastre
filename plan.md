# Web GIS Mining Cadastre Viewer — Implementation Plan

## Context

We are building a **read-only, high-performance Web GIS viewer** for mining licence data — inspired by FlexiCadastre / ArcGIS Enterprise / QGIS, but an original implementation. **The map is the application**; everything else exists to enhance interaction with it. It is explicitly **not** a cadastre *management* system: no application processing, payments, approvals, renewals, transfers, or document management.

A Claude Design mockup exists in `ref/project/` (`Zambia Mining Cadastre.dc.html` + `cadastre-data.js`). It is a hand-rolled SVG "fake map" that nails the **look & feel and data model** but uses no real map engine. We rebuild it as a real Web GIS on a live map engine, seeded with the reference's Zambia dataset.

**Decisions locked with the user:**
- **Phased delivery** — ship a solid, runnable v1 first; defer heavy import/export and scaling work to Phase 2.
- **Seed the Zambia reference dataset** (~55 licences + national/province boundaries) into PostGIS so the app is immediately usable.
- **OpenLayers + ol-ext** as the map engine.
- **OSM + ESRI World Imagery** as key-free default basemaps; **Google via env key**; default basemap set in one config file.

**Stack change from the original prompt (per user):** Next.js + Supabase (Postgres/PostGIS) + Vercel via GitHub — replacing the prompt's React/Vite + Express + Docker. OpenLayers/Turf/proj4/Zustand/Tailwind/shadcn are retained.

## Approach

### Tech stack
- **Next.js 15 (App Router), React 19, TypeScript (strict)** — deployed to **Vercel** from **GitHub**.
- **Tailwind CSS + shadcn/ui** for chrome; **Zustand** for app state (selection, layers, tools, theme, coord format).
- **OpenLayers + ol-ext** for the map; **proj4** for CRS conversions; **Turf.js** for client-side geometry (measure previews, buffer preview).
- **Supabase**: Postgres + **PostGIS** for storage and all heavy spatial ops, exposed via **PL/pgSQL RPC functions** (`ST_Contains`, `ST_Intersects`, `ST_Within`, `ST_Buffer`, `ST_Distance`, `ST_Area`, `ST_AsGeoJSON`, etc.). Next.js **Route Handlers** (`app/api/*`) wrap RPCs; simple reads use the Supabase JS client directly.
- **Data transport**: licences served as **GeoJSON** (`ST_AsGeoJSON`) with an optional bbox filter. v1 loads all ~55 features once; the API contract is bbox-ready so Phase 2 can switch to bbox/vector-tile loading without a client rewrite.

### Map engine is client-only
OpenLayers touches `window`, so the entire map lives in a `'use client'` component loaded via `next/dynamic` with `ssr:false`. The rest of the shell can render on the server.

### Design system (from the reference — reuse verbatim)
- **Fonts**: IBM Plex Sans (UI), IBM Plex Mono (coords/licence numbers/status bar) via `next/font`.
- **Palette**: app bg `#F8FAFC`, panels `#FFFFFF`, borders `#E2E8F0`/`#CBD5E1`; brand navy bars `#0F2A43` (border `#0B2136`, field `#173953`/`#1E4262`); accent/active blue `#1D4E89`; logo amber `#D97706`; link blue `#93C5FD`; text `#1E293B`/`#334155`/`#64748B`/`#94A3B8`.
- **Status colors** (`STATUS_COLORS`): Active `#16A34A`, Pending `#D97706`, Reserved `#0891B2`, Suspended `#EA580C`, Expired `#94A3B8`, Cancelled `#DC2626`. Drives polygon fill, legend, chips, layer-tree checkboxes.
- **Layout**: top bar 56px → three-column main row (left 308px collapsible · flexible map · right 320px conditional) → status bar 28px. Left tabs: **Layers / Search / Tools**. Floating over the map: zoom +/−/home (top-right), compass "N", vertical tool rail (top-left), basemap toggle (bottom-center), status legend + scale bar (bottom-left), overview minimap (bottom-right), live coordinate readout.
- Tokens centralized in `lib/theme.ts` + Tailwind config; **light + dark** both implemented (reference is light-only — we add a real dark theme keyed off Zustand + `data-theme`).

## Project structure / critical files

```
/ (repo root — Next.js app)
├─ CLAUDE.md, plan.md, todo.md, session.md   # working files (see below)
├─ .env.local.example                         # env var names only
├─ next.config.ts, tailwind.config.ts, tsconfig.json (strict), .eslintrc, .prettierrc
├─ config/
│  ├─ basemaps.ts        # basemap registry + DEFAULT_BASEMAP (single source of truth)
│  └─ app.config.ts      # default CRS, coord formats, feature flags
├─ lib/
│  ├─ supabase/client.ts, server.ts
│  ├─ theme.ts           # color tokens + STATUS_COLORS
│  ├─ crs.ts             # proj4 setup: 4326/3857/UTM zone-from-lon, formatters
│  ├─ coord-parse.ts     # parse decimal / DMS / UTM  -> lon/lat
│  └─ geo.ts             # Turf helpers (area, distance, buffer, centroid)
├─ store/
│  └─ useMapStore.ts     # Zustand: selection, layer state, active tool, theme, coordFormat
├─ components/
│  ├─ map/               # MapCanvas (OL), layers (licences, boundaries, basemap), controls
│  │  ├─ MapCanvas.tsx   # 'use client', dynamic ssr:false
│  │  ├─ licenceLayer.ts, boundaryLayer.ts, styles.ts (status styling/hover/select/flash)
│  │  └─ controls/       # Zoom, Compass, ScaleBar, OverviewMap, CoordinateReadout
│  ├─ shell/             # TopBar, StatusBar, LeftPanel(tabs), RightPanel(feature detail)
│  ├─ tools/             # ToolRail + Measure/Buffer/Select/Identify handlers
│  ├─ search/            # LicenceSearch, CoordinateSearch
│  ├─ layers/            # LayerTree (visibility/opacity/legend)
│  └─ attribute-table/   # AttributeTable (sort/filter/paginate, CSV/GeoJSON export)
├─ app/
│  ├─ layout.tsx, page.tsx  # page.tsx = the map app (launches straight into the map)
│  └─ api/
│     ├─ licences/route.ts        # GET GeoJSON (optional bbox)
│     ├─ licences/[id]/route.ts   # GET single licence detail
│     ├─ query/point/route.ts     # point-in-polygon (ST_Contains) for coord search
│     ├─ query/bbox/route.ts, query/nearest/route.ts, query/within/route.ts
├─ supabase/
│  ├─ migrations/0001_init.sql    # PostGIS ext, tables, GiST indexes, RPC functions
│  └─ seed/seed.ts                # inverse-project ref data -> WGS84, insert via PostGIS
└─ scripts/…
```

### Database schema (`supabase/migrations/0001_init.sql`)
- `create extension postgis;`
- **`licences`**: `id`, `licence_number`, `owner`, `commodity`, `licence_type`, `status`, `province`, `area_ha` (numeric), `issue_date`, `expiry_date`, `metadata jsonb`, `geom geometry(MultiPolygon,4326)`. **GiST index on `geom`**; btree indexes on `status`, `commodity`, `licence_number`.
- **`boundaries`**: national outline + province lines (`geom`, `name`, `kind`).
- RPC functions (SECURITY DEFINER, exposed to anon read-only): `licences_geojson(bbox)`, `licence_at_point(lon,lat)` → `ST_Contains`, `licences_in_bbox(...)`, `nearest_licence(lon,lat)` → `ST_Distance` + `<->` KNN, `licences_within_distance(lon,lat,m)`, `licence_stats(id)` → area/centroid/perimeter. RLS: read-only `select` policy for `anon`.

### Seed (`supabase/seed/seed.ts`)
Reuse `ref/project/cadastre-data.js`. RAW parcel `pts` are in the mock's 1200×900 SVG space — **inverse-project** with `lon=(x-55)/82+21.5`, `lat=-((y-70)/82+8.0)` to recover WGS84; the EXTRA licences are regenerated directly from their source lon/lat. Build GeoJSON MultiPolygons, insert via `ST_GeomFromGeoJSON`. Also seed the national outline + province lines (already WGS84 in the data file). Idempotent (truncate + reinsert). Run with the service-role key.

## v1 feature breakdown

**Map core** — pan, wheel/double-click zoom, rotate, fullscreen, home extent, scale bar, compass/north arrow, zoom slider, overview map, live mouse coordinate readout, current scale + projection display.

**Basemaps** — registry in `config/basemaps.ts`: OSM (default), ESRI World Imagery, ESRI World Topo, generic XYZ, WMTS-ready; Google Maps/Satellite entries activated only when `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set. Basemap switcher in Layers tab + floating toggle.

**Licence layer** — GeoJSON from API; per-status fill/stroke from `STATUS_COLORS`; hover highlight, click select + selection outline, labels, tooltip, popup (Licence #, Owner, Commodity, Type, Status, Area, Coordinates/centroid, Issue/Expiry, geometry stats), opacity control, visibility toggle, zoom-to-feature, flash animation.

**Coordinate display & search** — readout + format switch (WGS84 decimal / DMS, Web Mercator, UTM) via `lib/crs.ts`. Coordinate search box parses decimal / DMS / UTM (`lib/coord-parse.ts`) → zoom + drop marker → call `query/point` (`ST_Contains`) → if inside a licence, highlight + open popup; else notify "no licence here".

**Search** — debounced text search over licence number / owner / commodity / status / type / province / area / polygon id; result cards; select zooms to feature.

**Spatial tools (v1 set)** — Measure Distance, Measure Area, Identify Feature, Buffer (km slider → `ST_Buffer`), Select by Rectangle, Select by Circle, Select by Polygon, Nearest Licence, Point-in-Polygon query, Bounding-box query, Coordinate capture, Geometry info, Feature highlight, Clear selection, Reset view. Live previews via Turf; authoritative results via PostGIS RPC.

**Layer manager** — layer tree with visibility, opacity sliders, per-status toggles + counts, legend, basemap group. (Drag reorder + metadata panel: Phase 2.)

**Attribute table** — bottom drawer: sort, filter, text search, pagination, highlight/zoom to row, **export CSV + GeoJSON** (v1).

**UI shell** — collapsible left panel (Layers/Search/Tools tabs), conditional right feature-detail panel, floating tool rail, bottom status bar, **light + dark mode**, enterprise styling per design tokens. Launches straight into the map (no dashboard).

## Deferred to Phase 2 (documented, not built in v1)
Shapefile(ZIP)/KML/GPX/GeoJSON **import** with CRS auto-detect + geometry validation; **PNG/PDF map-layout export**; vector-tile rendering; geometry simplification by zoom; Web Workers; bbox/lazy loading swap-in; layer drag-ordering + metadata; ST_Union/ST_Intersection overlay tools; 100k+ scale tuning. The v1 API/layer contracts are built bbox-ready so these slot in without rework.

## Working files (per `new-project-prompt.md`)
Create at repo root as part of setup: **CLAUDE.md** (overview, stack, architecture, domain conventions incl. STATUS_COLORS + CRS model, env var names, dev/build/lint/test commands, the working-file rules, out-of-scope), **plan.md** (this plan as the historical record), **todo.md** (seeded checklist grouped by area — infra, DB/seed, map core, licence layer, search, tools, layer manager, attribute table, theme; with an "Issues encountered & fixed" log), **session.md** (header + update-policy note; Supabase project ref / Vercel deploy IDs filled on first `/clear`).

## Verification
1. **DB/seed**: run migration + seed against Supabase; confirm `select count(*) from licences` ≈ 55 and `licence_at_point(28.28,-15.42)` (Lusaka) / a known parcel centroid returns the expected licence.
2. **Local app** (`npm run dev`): map launches full-screen; pan/zoom/rotate/fullscreen/home work; basemap switch (OSM↔ESRI) works.
3. **Licences render** with correct status colors; hover highlights; click opens popup with all fields; zoom-to + flash work.
4. **Coordinate search**: paste `-15.43210, 28.31254` and a DMS + a UTM sample → marker drops, correct licence highlights, or "no licence" notice.
5. **Text search** returns and zooms to a known licence (e.g. `LSM-2024-0147`).
6. **Tools**: measure distance/area match Turf; buffer + nearest + point-in-polygon return sane PostGIS results.
7. **Attribute table** sorts/filters/paginates; CSV + GeoJSON export download correctly.
8. **Coordinate format switch** (decimal/DMS/UTM) and **dark mode** both toggle correctly.
9. `npm run lint`, `npm run typecheck`, `npm run build` all pass.
10. **Deploy**: push to GitHub → Vercel build succeeds with env vars set; production map loads and queries Supabase. Run `/verify` on the deployed flow.

## Out of scope (hard exclusions)
Licence application/renewal/transfer workflows, payments, approvals, document management, user/admin modules unrelated to map visualization. Viewer only.
