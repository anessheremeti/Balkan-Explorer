-- ============================================================
-- Travel Explorer — Production PostgreSQL/PostGIS Schema
-- Run once via Supabase SQL editor or psql.
-- Requires: uuid-ossp, postgis extensions (both available on Supabase).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Reference tables ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS countries (
  id        uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code      char(2)     UNIQUE NOT NULL,          -- ISO 3166-1 alpha-2
  name      varchar(100) NOT NULL,
  continent varchar(50)
);

CREATE TABLE IF NOT EXISTS cities (
  id           uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id   uuid         REFERENCES countries(id),
  name         varchar(200) NOT NULL,
  name_en      varchar(200),
  location     geography(Point, 4326) NOT NULL,   -- PostGIS point (lon, lat)
  population   integer,
  timezone     varchar(50),
  UNIQUE (name, country_id)
);

CREATE INDEX IF NOT EXISTS cities_location_gist ON cities USING GIST(location);

CREATE TABLE IF NOT EXISTS place_categories (
  id   serial      PRIMARY KEY,
  slug varchar(50) UNIQUE NOT NULL,   -- 'restaurant', 'museum', etc.
  name varchar(100) NOT NULL,
  icon varchar(50)
);

INSERT INTO place_categories (slug, name, icon) VALUES
  ('restaurant', 'Restaurant',     'utensils'),
  ('cafe',       'Café',           'coffee'),
  ('museum',     'Museum',         'landmark'),
  ('attraction', 'Attraction',     'camera'),
  ('viewpoint',  'Viewpoint',      'binoculars'),
  ('park',       'Park / Garden',  'tree'),
  ('historic',   'Historic Site',  'monument')
ON CONFLICT (slug) DO NOTHING;

-- ── Core places table (centralised, NOT per-city) ─────────────────────────────
-- Scalable to millions of rows via GiST index + city/category composite indexes.

CREATE TABLE IF NOT EXISTS places (
  id             uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id        uuid         REFERENCES cities(id),
  external_id    varchar(100) UNIQUE,              -- 'osm:node:123456' | 'otm:Xabc'
  source         varchar(20)  NOT NULL
                   CHECK (source IN ('openstreetmap','opentripmap','google','manual')),
  category_id    integer      REFERENCES place_categories(id),
  name           varchar(300) NOT NULL,
  description    text,
  location       geography(Point, 4326) NOT NULL,
  rating         numeric(3, 2),
  review_count   integer      DEFAULT 0,
  price_level    smallint,                          -- 1 (cheap) – 4 (expensive)
  image_url      text,
  website        text,
  phone          varchar(30),
  opening_hours  jsonb,
  metadata       jsonb        DEFAULT '{}',
  verified_at    timestamptz  DEFAULT now(),
  created_at     timestamptz  DEFAULT now(),
  updated_at     timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS places_location_gist ON places USING GIST(location);
CREATE INDEX IF NOT EXISTS places_city_idx      ON places(city_id);
CREATE INDEX IF NOT EXISTS places_category_idx  ON places(category_id);
CREATE INDEX IF NOT EXISTS places_source_idx    ON places(source);
-- Full-text search on place names
CREATE INDEX IF NOT EXISTS places_name_fts ON places USING GIN(to_tsvector('english', name));

-- ── Provider health (in-DB replica of in-process circuit breaker state) ───────

CREATE TABLE IF NOT EXISTS provider_health (
  id            serial      PRIMARY KEY,
  provider_name varchar(50) NOT NULL UNIQUE,
  status        varchar(20) NOT NULL DEFAULT 'healthy'  -- healthy | degraded | offline
                   CHECK (status IN ('healthy','degraded','offline')),
  success_count integer     DEFAULT 0,
  failure_count integer     DEFAULT 0,
  avg_latency_ms integer    DEFAULT 0,
  last_success  timestamptz,
  last_failure  timestamptz,
  last_error    text,
  circuit_state varchar(10) DEFAULT 'CLOSED'
                   CHECK (circuit_state IN ('CLOSED','OPEN','HALF_OPEN')),
  updated_at    timestamptz DEFAULT now()
);

INSERT INTO provider_health (provider_name) VALUES
  ('overpass-main'), ('overpass-kumi'), ('nominatim'), ('opentripmap'),
  ('gemini-flash'), ('deepseek-r1'), ('llama-3.3'), ('qwen3-8b'), ('phi-4')
ON CONFLICT (provider_name) DO NOTHING;

-- ── Places (extend existing table — the CREATE TABLE above is a no-op if it
--    already exists with latitude/longitude columns from the original schema) ──

ALTER TABLE places ADD COLUMN IF NOT EXISTS location       geography(Point, 4326);
ALTER TABLE places ADD COLUMN IF NOT EXISTS external_id    varchar(100);
ALTER TABLE places ADD COLUMN IF NOT EXISTS source         varchar(20);
ALTER TABLE places ADD COLUMN IF NOT EXISTS city_id        uuid;
ALTER TABLE places ADD COLUMN IF NOT EXISTS category_id    integer;
ALTER TABLE places ADD COLUMN IF NOT EXISTS price_level    smallint;
ALTER TABLE places ADD COLUMN IF NOT EXISTS website        text;
ALTER TABLE places ADD COLUMN IF NOT EXISTS phone          varchar(30);
ALTER TABLE places ADD COLUMN IF NOT EXISTS opening_hours  jsonb;
ALTER TABLE places ADD COLUMN IF NOT EXISTS metadata       jsonb DEFAULT '{}';
ALTER TABLE places ADD COLUMN IF NOT EXISTS verified_at    timestamptz DEFAULT now();
ALTER TABLE places ADD COLUMN IF NOT EXISTS updated_at     timestamptz DEFAULT now();

-- Populate geography column from existing lat/lon columns (safe to re-run: WHERE location IS NULL)
UPDATE places
SET    location = ST_SetSRID(ST_Point(longitude, latitude), 4326)::geography
WHERE  location IS NULL
  AND  latitude  IS NOT NULL
  AND  longitude IS NOT NULL;

-- GIST index on location — will be a no-op if already created above
CREATE INDEX IF NOT EXISTS places_location_gist ON places USING GIST(location);
CREATE INDEX IF NOT EXISTS places_city_idx      ON places(city_id);
CREATE INDEX IF NOT EXISTS places_category_idx  ON places(category_id);

-- ── Trips (extend existing with missing columns) ──────────────────────────────

ALTER TABLE trips ADD COLUMN IF NOT EXISTS starting_date    date;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS returning_date   date;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS guest_id         uuid;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS itinerary_status varchar(30) DEFAULT 'pending';

-- ── Itinerary items (extend with source tracing) ──────────────────────────────

ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS external_place_id varchar(100);
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS source            varchar(30);
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS lat               double precision;
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS lon               double precision;

-- ── PostGIS helper function: places within radius ────────────────────────────
-- Usage: SELECT * FROM places_near(42.1, 19.2, 5000, 'museum', 20);
-- Works with both old rows (location populated from lat/lon above) and new inserts.

CREATE OR REPLACE FUNCTION places_near(
  center_lat    double precision,
  center_lon    double precision,
  radius_m      integer  DEFAULT 5000,
  cat_slug      varchar  DEFAULT NULL,
  result_limit  integer  DEFAULT 50
)
RETURNS SETOF places
LANGUAGE sql STABLE AS $$
  SELECT p.*
  FROM   places p
  LEFT JOIN place_categories c ON c.id = p.category_id
  WHERE  p.location IS NOT NULL
    AND  ST_DWithin(
           p.location,
           ST_SetSRID(ST_Point(center_lon, center_lat), 4326)::geography,
           radius_m
         )
    AND  (cat_slug IS NULL OR c.slug = cat_slug)
  ORDER BY ST_Distance(
    p.location,
    ST_SetSRID(ST_Point(center_lon, center_lat), 4326)::geography
  )
  LIMIT result_limit;
$$;
