DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON public.ratings;
CREATE POLICY "Authenticated users can view ratings"
ON public.ratings FOR SELECT
TO authenticated
USING (true);