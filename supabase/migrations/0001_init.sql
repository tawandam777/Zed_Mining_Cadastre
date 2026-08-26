-- Mining Cadastre Viewer — initial schema
-- PostGIS-backed licence + boundary storage, read-only RPC surface for the Next.js app.

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists licences (
  id uuid primary key default gen_random_uuid(),
  licence_number text not null unique,
  owner text not null,
  commodity text not null,
  licence_type text not null,
  status text not null check (status in ('Active', 'Pending', 'Reserved', 'Suspended', 'Expired', 'Cancelled')),
  province text,
  area_ha numeric,
  issue_date date,
  expiry_date date,
  metadata jsonb not null default '{}'::jsonb,
  geom geometry(MultiPolygon, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists licences_geom_gix on licences using gist (geom);
create index if not exists licences_status_idx on licences (status);
create index if not exists licences_commodity_idx on licences (commodity);
create index if not exists licences_licence_type_idx on licences (licence_type);
create index if not exists licences_province_idx on licences (province);
create index if not exists licences_licence_number_idx on licences (licence_number);

-- Real Zambia admin boundaries (national / province / district), sourced from the
-- Admin_Bounds/*.shp shapefiles (COD-AB style: adm0/adm1/adm2), not hand-drawn geometry.
create table if not exists boundaries (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  parent_name text,
  kind text not null check (kind in ('national', 'province', 'district')),
  geom geometry(Geometry, 4326) not null
);

create index if not exists boundaries_geom_gix on boundaries using gist (geom);
create index if not exists boundaries_kind_idx on boundaries (kind);

-- ---------------------------------------------------------------------------
-- Row Level Security — anon read-only
-- ---------------------------------------------------------------------------

alter table licences enable row level security;
alter table boundaries enable row level security;

drop policy if exists licences_read on licences;
create policy licences_read on licences for select using (true);

drop policy if exists boundaries_read on boundaries;
create policy boundaries_read on boundaries for select using (true);

-- ---------------------------------------------------------------------------
-- RPC functions (SECURITY DEFINER, read-only, exposed to anon via PostgREST)
-- ---------------------------------------------------------------------------

-- All licences (optionally clipped to a bbox) as a GeoJSON FeatureCollection.
create or replace function licences_geojson(
  bbox_xmin double precision default null,
  bbox_ymin double precision default null,
  bbox_xmax double precision default null,
  bbox_ymax double precision default null
)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'id', l.id,
        'geometry', ST_AsGeoJSON(l.geom)::jsonb,
        'properties', jsonb_build_object(
          'id', l.id,
          'licenceNumber', l.licence_number,
          'owner', l.owner,
          'commodity', l.commodity,
          'licenceType', l.licence_type,
          'status', l.status,
          'province', l.province,
          'areaHa', l.area_ha,
          'issueDate', l.issue_date,
          'expiryDate', l.expiry_date
        )
      )
    ), '[]'::jsonb)
  )
  from licences l
  where bbox_xmin is null
     or ST_Intersects(l.geom, ST_MakeEnvelope(bbox_xmin, bbox_ymin, bbox_xmax, bbox_ymax, 4326));
$$;

-- Single licence detail, including derived geometry stats.
create or replace function licence_detail(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'id', l.id,
    'licenceNumber', l.licence_number,
    'owner', l.owner,
    'commodity', l.commodity,
    'licenceType', l.licence_type,
    'status', l.status,
    'province', l.province,
    'areaHa', l.area_ha,
    'issueDate', l.issue_date,
    'expiryDate', l.expiry_date,
    'metadata', l.metadata,
    'geometry', ST_AsGeoJSON(l.geom)::jsonb,
    'centroid', ST_AsGeoJSON(ST_Centroid(l.geom))::jsonb,
    'areaSqKm', ST_Area(l.geom::geography) / 1000000.0,
    'perimeterKm', ST_Perimeter(l.geom::geography) / 1000.0
  )
  from licences l
  where l.id = p_id;
$$;

-- Point-in-polygon lookup for coordinate search: which licence (if any) contains this point.
create or replace function licence_at_point(p_lon double precision, p_lat double precision)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'id', l.id,
    'licenceNumber', l.licence_number,
    'owner', l.owner,
    'commodity', l.commodity,
    'licenceType', l.licence_type,
    'status', l.status,
    'province', l.province,
    'areaHa', l.area_ha,
    'issueDate', l.issue_date,
    'expiryDate', l.expiry_date,
    'geometry', ST_AsGeoJSON(l.geom)::jsonb,
    'centroid', ST_AsGeoJSON(ST_Centroid(l.geom))::jsonb
  )
  from licences l
  where ST_Contains(l.geom, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326))
  limit 1;
$$;

-- Nearest licence to a point (KNN via <->), with distance in metres.
create or replace function nearest_licence(p_lon double precision, p_lat double precision)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'id', l.id,
    'licenceNumber', l.licence_number,
    'owner', l.owner,
    'commodity', l.commodity,
    'status', l.status,
    'geometry', ST_AsGeoJSON(l.geom)::jsonb,
    'distanceMeters', ST_Distance(l.geom::geography, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography)
  )
  from licences l
  order by l.geom <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)
  limit 1;
$$;

-- Licences whose centroid (or geometry) falls within a given radius (metres) of a point.
create or replace function licences_within_distance(p_lon double precision, p_lat double precision, p_meters double precision)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', l.id,
      'licenceNumber', l.licence_number,
      'owner', l.owner,
      'status', l.status,
      'geometry', ST_AsGeoJSON(l.geom)::jsonb,
      'distanceMeters', ST_Distance(l.geom::geography, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography)
    )
  ), '[]'::jsonb)
  from licences l
  where ST_DWithin(l.geom::geography, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography, p_meters);
$$;

-- Licences intersecting an arbitrary bbox (used by rectangle-select tool).
create or replace function licences_in_bbox(
  bbox_xmin double precision, bbox_ymin double precision,
  bbox_xmax double precision, bbox_ymax double precision
)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', l.id,
      'licenceNumber', l.licence_number,
      'owner', l.owner,
      'status', l.status,
      'geometry', ST_AsGeoJSON(l.geom)::jsonb
    )
  ), '[]'::jsonb)
  from licences l
  where ST_Intersects(l.geom, ST_MakeEnvelope(bbox_xmin, bbox_ymin, bbox_xmax, bbox_ymax, 4326));
$$;

-- Buffer a point by a radius (km) and return intersecting licences.
create or replace function licences_in_buffer(p_lon double precision, p_lat double precision, p_radius_km double precision)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', l.id,
      'licenceNumber', l.licence_number,
      'owner', l.owner,
      'status', l.status,
      'geometry', ST_AsGeoJSON(l.geom)::jsonb
    )
  ), '[]'::jsonb)
  from licences l
  where ST_DWithin(
    l.geom::geography,
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
    p_radius_km * 1000
  );
$$;

-- Admin boundaries (national + province + district) as a single GeoJSON FeatureCollection,
-- tagged with `kind` so the client (or the provider layer) can split it into three layers.
create or replace function boundaries_geojson()
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'id', b.id,
        'geometry', ST_AsGeoJSON(b.geom)::jsonb,
        'properties', jsonb_build_object('name', b.name, 'province', b.parent_name, 'kind', b.kind)
      )
    ), '[]'::jsonb)
  )
  from boundaries b;
$$;

grant execute on function licences_geojson to anon, authenticated;
grant execute on function licence_detail to anon, authenticated;
grant execute on function licence_at_point to anon, authenticated;
grant execute on function nearest_licence to anon, authenticated;
grant execute on function licences_within_distance to anon, authenticated;
grant execute on function licences_in_bbox to anon, authenticated;
grant execute on function licences_in_buffer to anon, authenticated;
grant execute on function boundaries_geojson to anon, authenticated;
