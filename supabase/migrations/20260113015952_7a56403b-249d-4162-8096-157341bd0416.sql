-- Add partner preferences to profiles
ALTER TABLE public.profiles
ADD COLUMN preferred_skill_levels text[] DEFAULT ARRAY[]::text[],
ADD COLUMN preferred_instruments text[] DEFAULT ARRAY[]::text[];

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.preferred_skill_levels IS 'Array of skill levels the user wants to play with. Empty means all levels.';
COMMENT ON COLUMN public.profiles.preferred_instruments IS 'Array of instruments the user wants to play with. Empty means all instruments.';