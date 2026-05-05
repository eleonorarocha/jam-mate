-- 1) Profiles: require authentication for public profile read
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (onboarding_completed = true);

-- 2) Storage: restrict jam-media uploads to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload jam media" ON storage.objects;
CREATE POLICY "Users can upload own jam media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'jam-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) Notifications: remove self-insert (only service role inserts)
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

-- 4) Realtime authorization: require authenticated for realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime messages"
ON realtime.messages FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "Authenticated can write realtime messages"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (true);