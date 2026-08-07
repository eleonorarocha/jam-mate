ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS genres text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_profiles_genres ON public.profiles USING GIN (genres);

CREATE OR REPLACE FUNCTION public.validate_profile_genres()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY['rock','pop','jazz','blues','funk','soul','classica','folk','eletronica','hiphop','reggae','metal','punk','latina','country','world'];
  g text;
BEGIN
  IF NEW.genres IS NULL THEN
    NEW.genres := '{}'::text[];
    RETURN NEW;
  END IF;

  FOREACH g IN ARRAY NEW.genres LOOP
    IF NOT (g = ANY(allowed)) THEN
      RAISE EXCEPTION 'Invalid music genre "%"', g USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- de-duplicate
  SELECT ARRAY(SELECT DISTINCT unnest(NEW.genres)) INTO NEW.genres;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_genres_trigger ON public.profiles;
CREATE TRIGGER validate_profile_genres_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_genres();