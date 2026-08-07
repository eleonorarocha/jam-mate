-- 1. PostGIS (instalado no schema extensions, como é padrão no Supabase)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 2. Coluna geográfica derivada das coordenadas APROXIMADAS (privacidade)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approx_geom extensions.geometry(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN approx_longitude IS NOT NULL AND approx_latitude IS NOT NULL
      THEN extensions.ST_SetSRID(
             extensions.ST_MakePoint(approx_longitude::float8, approx_latitude::float8),
             4326)
      ELSE NULL
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS profiles_approx_geom_gist
  ON public.profiles USING GIST (approx_geom);

-- 3. RPC de clustering server-side por viewport + zoom
CREATE OR REPLACE FUNCTION public.get_map_clusters(
  _min_lng double precision,
  _min_lat double precision,
  _max_lng double precision,
  _max_lat double precision,
  _zoom    integer
)
RETURNS TABLE (
  cluster_key text,
  lng         double precision,
  lat         double precision,
  point_count integer,
  pro_count   integer,
  profile_id  uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  WITH params AS (
    -- Tamanho de célula em graus: ~4 células por "tile" do nível de zoom pedido.
    SELECT GREATEST(360.0 / POWER(2, GREATEST(LEAST(_zoom, 20), 0)) / 4.0, 0.0001) AS cell
  ),
  visible AS (
    SELECT
      p.id,
      p.approx_longitude::double precision AS lng,
      p.approx_latitude::double precision  AS lat,
      (p.pro_until IS NOT NULL AND p.pro_until > now()) AS is_pro,
      ST_SnapToGrid(p.approx_geom, (SELECT cell FROM params)) AS cell_geom
    FROM public.profiles p
    WHERE p.onboarding_completed = true
      AND p.approx_geom IS NOT NULL
      AND p.approx_geom && ST_MakeEnvelope(_min_lng, _min_lat, _max_lng, _max_lat, 4326)
      AND NOT public.has_block_between(auth.uid(), p.id)
  )
  SELECT
    ST_AsText(cell_geom)                                   AS cluster_key,
    AVG(lng)                                               AS lng,
    AVG(lat)                                               AS lat,
    COUNT(*)::integer                                      AS point_count,
    COUNT(*) FILTER (WHERE is_pro)::integer                AS pro_count,
    CASE WHEN COUNT(*) = 1 THEN (array_agg(id))[1] ELSE NULL END AS profile_id
  FROM visible
  GROUP BY cell_geom;
$$;

REVOKE ALL ON FUNCTION public.get_map_clusters(double precision, double precision, double precision, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_map_clusters(double precision, double precision, double precision, double precision, integer) TO authenticated;