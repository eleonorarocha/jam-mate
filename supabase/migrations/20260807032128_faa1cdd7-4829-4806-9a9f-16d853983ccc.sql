DROP FUNCTION IF EXISTS public.get_map_clusters(double precision, double precision, double precision, double precision, integer);
DROP INDEX IF EXISTS public.profiles_approx_geom_gist;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS approx_geom;
DROP EXTENSION IF EXISTS postgis;