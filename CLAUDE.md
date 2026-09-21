# CLAUDE.md

## Project Overview
Mining Cadastre Viewer — an enterprise-grade Web GIS application for visualizing, searching, and spatially exploring mining licence data (Zambia dataset). It is a **read-only viewer**, not a licensing/management system: no applications, renewals, payments, approvals, transfers, or document management. The map is the application; every other panel exists to support interaction with it.

## Tech Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict) — deployed to **Vercel**, source on **GitHub**.
- **Tailwind CSS v4** + **shadcn/ui** ("base-nova" style, base-ui primitives) for chrome/panels.
- **Zustand** for client state (selection, layer visibility/opacity, active tool, theme, coordinate format).
- **OpenLayers** + **ol-ext** for the map engine; **proj4** for CRS conversions (WGS84 / Web Mercator / UTM); **Turf.js** for client-side geometry previews (measure, buffer) and for the offline data provider's spatial queries.
- **Supabase**: Postgres + **PostGIS** for storage and spatial queries, called via PL/pgSQL RPC functions wrapped by Next.js Route Handlers — see "Data provider" below for the offline fallback.
- **Sentry** (`@sentry/nextjs`) for error monitoring — `instrumentation.ts` (server/edge) + `instrumentation-client.ts` (browser) + `app/global-error.tsx`. No-ops entirely without `NEXT_PUBLIC_SENTRY_DSN` set, so it's inert in local dev.

## Architecture
```
app/                    Next.js routes
  page.tsx              The map app (launches straight into the map, no dashboard)
  api/licences/         GeoJSON licence endpoints
  api/query/            point / bbox / nearest / within spatial query endpoints
components/
  map/                  MapCanvas (OpenLayers, client-only via next/dynamic ssr:false),
                         licence/boundary layers, styles, controls (zoom, compass,
                         scale bar, overview map, coordinate readout, basemap switcher)
  shell/                TopBar, StatusBar, LeftPanel (Layers/Search tabs only), RightPanel
  tools/                Floating tool rail + tool-status panel + spatial-tool handlers —
                         all tool interaction lives on the map toolbar, not the sidebar
  search/               Text search + coordinate search
  layers/               Layer tree (national/province/district opacity, licence status legend)
  attribute-table/      Sortable/filterable table with CSV/GeoJSON export
config/
  basemaps.ts           Basemap registry + DEFAULT_BASEMAP (single source of truth)
  app.config.ts         Default CRS, coordinate formats, feature flags
lib/                    supabase client/server, theme tokens, crs.ts, coord-parse.ts, geo.ts
  data/                 DataProvider abstraction — see "Data provider" below
store/useMapStore.ts    Zustand store
supabase/
  migrations/           PostGIS schema + RPC functions
  seed/                 Seed script (generated boundaries + generated licences -> PostGIS)
scripts/
  generate-licences.ts   One-off generator -> lib/data/licences.generated.json (see below)
  generate-boundaries.ts One-off generator -> lib/data/boundaries.generated.json (see below)
Admin_Bounds/           Real Zambia admin boundary shapefiles (national/province/district) —
                        source data for generate-boundaries.ts, not read at runtime
```

## Data provider (offline-first)
Every API route calls `getProvider()` from `lib/data/index.ts` instead of talking to Supabase directly. It returns:
- **`supabaseProvider`** (`lib/data/supabaseProvider.ts`) when `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set — calls the real PostGIS RPCs.
- **`localProvider`** (`lib/data/localProvider.ts`) otherwise — a fully offline, in-memory provider that serves `lib/data/licences.generated.json` and `lib/data/boundaries.generated.json` (via `lib/data/adminBoundaries.ts`), answering spatial queries with Turf.js instead of PostGIS.

This means `npm run dev` works immediately with **zero external setup** — no Supabase project, no Docker, no Git even required to develop the app itself. The two providers implement the same `DataProvider` interface (`lib/data/types.ts`), so switching between them is just an env var away and requires no component changes.

**Known accuracy trade-off**: `localProvider`'s nearest/within-distance/buffer queries use each licence's **centroid**, not full-polygon distance like PostGIS's `ST_Distance`/`ST_DWithin`. Fine for offline dev with ~55 features; treat `supabaseProvider` as the accurate/production path.

## Admin boundaries & licence geometry (real data, not hand-drawn)
- **Boundaries are generated, not read from shapefiles at runtime.** The real Zambia admin boundary shapefiles (`Admin_Bounds/{Zambia Boundary,Zambia Provinces,Zambia Districts}/*.shp`, COD-AB style, WGS84) convert to ~40MB of GeoJSON — that raw size, parsed via the `shapefile` npm package + remapped with Turf on every request, was the actual cause of slow boundary loading (not just missing loading feedback — see todo.md's "Boundaries taking long to load" entry). `scripts/generate-boundaries.ts` (run via `npx tsx scripts/generate-boundaries.ts`, using `lib/data/shapefileLoader.ts` to read the raw `.shp`/`.dbf` buffers) simplifies province and district geometry with `turf.simplify` (province tolerance ~55m, district tolerance ~111m — both display-only geometry, never used for point-in-polygon or other authoritative ops) and writes the result to committed `lib/data/boundaries.generated.json` (~4MB, down from ~40MB). National boundary is left unsimplified (a single small feature, and `generate-licences.ts` relies on it for exact containment checks). `lib/data/adminBoundaries.ts` imports that generated file directly (same "static import, no runtime parsing" pattern as licences below) and tags each feature with `kind: national|province|district`. Province names use the shapefile's exact spelling, e.g. **"North-Western"** (hyphenated). `shapefileLoader.ts`/the `shapefile` package (a devDependency) are only ever used by the generate script now, not at runtime — `Admin_Bounds/*.shp` is source data for that script, not something any deployed route reads.
- To regenerate: `npx tsx scripts/generate-boundaries.ts`, then restart the dev server (the JSON is imported as a module, so Next needs to reload it).
- **`app/api/boundaries/route.ts` is `export const dynamic = "force-static"` + `revalidate = 3600`.** Next.js Route Handlers are *not* cached by default regardless of whether they touch dynamic data (unlike pages under `'auto'`) — without this, every page load re-invokes the serverless function and re-transfers the full ~4MB payload from scratch even though the data never changes except on redeploy. `force-static` prerenders the response at build time so Vercel's edge serves it directly with zero function re-invocation on cache hits; the 1h revalidate bounds staleness in case a future `supabaseProvider`-backed boundaries table ever changes without a redeploy. Don't remove this without re-measuring production load time — this is what actually fixed the "still slow in production" follow-up after the payload-size fix above.
- **Licence geometry is generated, not hand-drawn.** `scripts/generate-licences.ts` (run via `npx tsx scripts/generate-licences.ts`) takes the licence *attributes* (owner, commodity, status, type, area, dates, licence number — from the original `ref/project/cadastre-data.js` mock) and produces entirely new polygons: a shelf/skyline bin-packing algorithm sizes each rectangle from the licence's real `area_ha`, tiles them edge-to-edge (with a small ~90m gap — see the file's `GAP_DEG` comment for why exact-touching edges are numerically fragile) within North-Western and Copperbelt provinces (the majority) and scattered singly across the other 8, then verifies everything against the real national boundary. Output is committed to `lib/data/licences.generated.json` — treat that file as generated/derived, re-run the script (not hand-edited) if the packing logic changes. The `province` property on every licence is recomputed via real point-in-polygon lookup against the (generated) province geometry, not inherited from the old mock data.
- To regenerate: `npx tsx scripts/generate-licences.ts`, then restart the dev server (the JSON is imported as a module, so Next needs to reload it).

## Domain Conventions
- **Licence status taxonomy & colors** (`lib/theme.ts` → `STATUS_COLORS`): Active `#16A34A`, Pending `#D97706`, Reserved `#0891B2`, Suspended `#EA580C`, Expired `#94A3B8`, Cancelled `#DC2626`. Used for polygon fill/stroke, legend, chips, and layer-tree checkboxes — change colors only in this one file.
- **Licence hover/select styling** (`components/map/styles.ts` → `licenceStyleFunction`): hover, select, tool-selection, and flash all darken the outline to navy `#0F2A43` (matches the reference design); only the stroke *width* differs (hover=2px, selected/tool-selected/flashing=3px, default=1.25px). Don't reintroduce a hover state that only changes width — that was a bug fixed once already.
- **All spatial tools are toolbar-only.** There is no "Tools" tab in the left sidebar (removed by design) — `components/tools/ToolRail.tsx` (floating, top-left of the map) is the only way to activate a tool, and `components/tools/ToolStatusPanel.tsx` (floating, next to the rail) is the only place tool instructions/buffer-radius/measurements appear. Don't add tool controls back into `LeftPanel`.
- **Drag-based tools show a cursor-following live-measurement HUD** (`components/tools/liveMeasurement.ts` + the `measureHud` state in `MapCanvas.tsx`), distinct from `ToolStatusPanel`'s fixed final-result readout. Applies to measure distance/area, select-by-rectangle/circle/polygon; deliberately not buffer (slider-driven) or identify. Its visibility is derived at render time (`activeTool && !toolFrozen`) rather than reset via an effect — same reasoning as the dark-mode/RightPanel fixes logged in todo.md.
- **`pointermove` handling is `requestAnimationFrame`-throttled, not run per raw event.** `MapCanvas.tsx` stashes only the latest event and does the actual work (mouse-position store update, tool-overlay rebuild, live-measurement calc, hover hit-test) inside an rAF callback, capping it to ~60/sec regardless of how fast the browser fires raw pointer events (100-200+/sec is normal on modern hardware). This exists because it was a real, user-reported lag bug — anything added to that hot path (new tool behavior, new HUD content, etc.) must go inside `processPointerMove`, not as a second uncapped `map.on("pointermove", ...)` listener, or the same lag comes back.
- **Basemap switching is a floating control** (`components/map/controls/BasemapSwitcher.tsx`, bottom-center of the map canvas, per the reference design) — not in the Layers tab.
- **Administrative boundaries have three independent layers**, each with its own visibility toggle + opacity slider in the Layers tab: Zambia Boundary (national), Province Boundaries, District Boundaries. Store fields: `show*Boundary(ies)` / `*BoundaryOpacity` for `national`/`province`/`district`. **All layers (boundaries + licence statuses) default to fully on, full opacity** — see `DEFAULT_STATUS_VISIBILITY` in `lib/theme.ts` and the defaults in `store/useMapStore.ts`. Don't reintroduce a status/layer defaulting to hidden or partial opacity without being asked.
- **Default basemap and basemap registry** live only in `config/basemaps.ts`. Google Maps/Satellite entries only activate when `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set; Mapbox Streets/Satellite only activate when `NEXT_PUBLIC_MAPBOX_TOKEN` is set. `DEFAULT_BASEMAP_ID` itself is conditional on that token too — Mapbox once configured, OSM otherwise — because OpenStreetMap's raw tile server (`tile.openstreetmap.org`) is dev-only: its usage policy disallows production/bulk traffic and it will throttle or silently drop requests under real load (this was diagnosed directly — see todo.md's basemap-tile-loading entry). Don't change the production default back to plain `"osm"`.
- **CRS model**: internal storage/API is WGS84 (EPSG:4326) GeoJSON. Map display projection is Web Mercator (EPSG:3857). UTM zone is derived from longitude at display time (`lib/crs.ts`) — Zambia spans UTM zones 35S/36S.
- **Coordinate search** accepts decimal degrees, DMS, and UTM; parsing lives in `lib/coord-parse.ts`. Point-in-polygon uses PostGIS `ST_Contains` via `api/query/point` (or the local provider's Turf equivalent), never a client-side fallback for authoritative results in the Supabase-backed path.
- **Geometry**: all licence geometries are `MultiPolygon` in EPSG:4326 in the `licences.geom` column (GiST-indexed).
- **Dark mode**: toggled via Zustand (`theme`), applied as a `.dark` class on `<html>`. The top bar and status bar are hardcoded navy in light mode (`bg-brand-navy`) but must carry a `dark:bg-card` (or equivalent semantic-token) override so they match the sidebar's dark shade — never leave a literal hex background on those two bars without a `dark:` counterpart. Similarly, any literal text color (`text-slate-600`, `text-brand-navy`, etc.) applied to text that sits on a background using a semantic token (`bg-card`, `bg-popover`, `bg-background`) needs a `dark:text-*` companion — semantic tokens (`text-muted-foreground`, `text-foreground`) already flip automatically and don't need one. This was audited once already (see todo.md's issues log for the specific bugs found); keep it in mind for new components.
- **LeftPanel background is `bg-slate-100` in light mode** (a deliberate light grey, not `bg-card`/white) and `dark:bg-card` in dark mode — don't change this back to plain `bg-card` for light mode.
- **Layer settings persist across page reloads; map view never does.** `useMapStore` is wrapped in Zustand's `persist` middleware (`skipHydration: true`, rehydrated manually in `AppShell`'s mount effect to avoid an SSR hydration mismatch), `partialize`d to exactly: `basemapId`, the three boundary visibility+opacity pairs, `licenceOpacity`, `statusVisibility`. **Do not add other fields to that `partialize` list** (selection, active tool, search filters, map pan/zoom, mouse position) — those must reset fresh on every page load by design. The map's initial view is never persisted anywhere; it's always computed fresh from `HOME_EXTENT_LONLAT`, which is what makes "refresh keeps layer settings but always recenters on Zambia" work without any extra reset logic.

## Security / Safety Notes
- Supabase **service-role key** is used only in the seed script (server-side, never shipped to the client). The app uses the **anon key** with RLS read-only policies.
- No destructive DB operations run outside `supabase/migrations` and `supabase/seed` — confirm before running any ad-hoc SQL against the live project.
- Env values are never committed; only names are documented (see below / `.env.local.example`).

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, used by seed script — never set this in Vercel/any deployed runtime env)
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (optional — enables Google basemaps when set)
- `NEXT_PUBLIC_MAPBOX_TOKEN` (optional locally, recommended in production — enables Mapbox basemaps and becomes the default basemap when set)
- `NEXT_PUBLIC_SENTRY_DSN` (optional — enables Sentry error monitoring when set; the SDK no-ops without it)
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (optional, build-time only — enables Sentry source-map upload; build succeeds without them, just skips the upload)

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm run seed` — run `supabase/seed/seed.ts` against the configured Supabase project
- `npm run generate:licences` — regenerate `lib/data/licences.generated.json` from `scripts/generate-licences.ts`
- `npm run generate:boundaries` — regenerate `lib/data/boundaries.generated.json` from `scripts/generate-boundaries.ts`

## Project Documentation Files
Four working files, each with a distinct job:
- **CLAUDE.md** (this file) — always-true rules, auto-loaded every turn. Update only when conventions/architecture genuinely change.
- **plan.md** — the architectural plan agreed at project start. Historical record; never overwritten after approval (append "Plan v2" sections instead).
- **todo.md** — the living checklist, grouped by area, with status markers `[ ]`/`[~]`/`[x]`/`[!]` and an "Issues encountered & fixed" log. Update continuously.
- **session.md** — snapshot of conversation-only state (service IDs, live-environment quirks, ad-hoc migrations, open work). Updated only at `/clear` or on explicit request — otherwise leave alone.

Resume order in a fresh session: CLAUDE.md (auto) → todo.md → session.md → plan.md.

## Out of Scope
Licence application/renewal/transfer workflows, payments, approvals, document management, user/admin modules unrelated to map visualization. Also deferred to a later phase (not built in v1): Shapefile/KML/GPX import, PNG/PDF map export, vector-tile rendering, geometry simplification by zoom, Web Workers, bbox/lazy-loading, layer drag-ordering, ST_Union/ST_Intersection overlay tools, 100k+ feature scale tuning.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
