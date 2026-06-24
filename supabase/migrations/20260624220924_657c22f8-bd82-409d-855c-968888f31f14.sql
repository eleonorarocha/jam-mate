
CREATE TABLE public.music_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_seconds NUMERIC NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX music_snippets_one_per_user ON public.music_snippets(user_id);

GRANT SELECT ON public.music_snippets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_snippets TO authenticated;
GRANT ALL ON public.music_snippets TO service_role;

ALTER TABLE public.music_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view music snippets"
  ON public.music_snippets FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own snippet"
  ON public.music_snippets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snippet"
  ON public.music_snippets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snippet"
  ON public.music_snippets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Storage policies for music-snippets bucket (files stored under <user_id>/...)
CREATE POLICY "Public read music snippets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'music-snippets');

CREATE POLICY "Users can upload own music snippets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'music-snippets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own music snippets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'music-snippets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own music snippets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'music-snippets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
