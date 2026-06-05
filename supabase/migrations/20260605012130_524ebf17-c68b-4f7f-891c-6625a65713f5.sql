-- Normalize and validate profiles.language at the database level
CREATE OR REPLACE FUNCTION public.normalize_profile_language()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm text;
BEGIN
  IF NEW.language IS NULL OR btrim(NEW.language) = '' THEN
    NEW.language := NULL;
    RETURN NEW;
  END IF;

  norm := lower(substring(btrim(NEW.language) from 1 for 2));

  IF norm NOT IN ('pt','en','es','fr') THEN
    RAISE EXCEPTION 'Invalid language code "%": must be one of pt, en, es, fr', NEW.language
      USING ERRCODE = '22023';
  END IF;

  NEW.language := norm;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_profile_language_trigger ON public.profiles;
CREATE TRIGGER normalize_profile_language_trigger
BEFORE INSERT OR UPDATE OF language ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.normalize_profile_language();

-- Backfill existing rows: normalize any non-conforming values to a safe default
UPDATE public.profiles
SET language = lower(substring(btrim(language) from 1 for 2))
WHERE language IS NOT NULL
  AND lower(substring(btrim(language) from 1 for 2)) IN ('pt','en','es','fr')
  AND language <> lower(substring(btrim(language) from 1 for 2));

UPDATE public.profiles
SET language = NULL
WHERE language IS NOT NULL
  AND lower(substring(btrim(language) from 1 for 2)) NOT IN ('pt','en','es','fr');