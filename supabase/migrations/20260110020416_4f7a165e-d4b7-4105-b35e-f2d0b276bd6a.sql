-- Add phone number and verification fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT FALSE;

-- Remove exact_address and postal_code from profiles (no longer needed - users arrange meeting location themselves)
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS exact_address,
DROP COLUMN IF EXISTS postal_code;

-- Update ratings table to have specific criteria
ALTER TABLE public.ratings
ADD COLUMN IF NOT EXISTS location_rating INTEGER CHECK (location_rating >= 1 AND location_rating <= 5),
ADD COLUMN IF NOT EXISTS respect_rating INTEGER CHECK (respect_rating >= 1 AND respect_rating <= 5),
ADD COLUMN IF NOT EXISTS punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
ADD COLUMN IF NOT EXISTS enjoyment_rating INTEGER CHECK (enjoyment_rating >= 1 AND enjoyment_rating <= 5);

-- Create media gallery table for jam recordings and photos
CREATE TABLE IF NOT EXISTS public.jam_media (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on jam_media
ALTER TABLE public.jam_media ENABLE ROW LEVEL SECURITY;

-- Users can view public media or their own
CREATE POLICY "Users can view public media or own media"
ON public.jam_media
FOR SELECT
USING (is_public = TRUE OR uploader_id = auth.uid());

-- Users can upload their own media
CREATE POLICY "Users can upload their own media"
ON public.jam_media
FOR INSERT
WITH CHECK (auth.uid() = uploader_id);

-- Users can update their own media
CREATE POLICY "Users can update their own media"
ON public.jam_media
FOR UPDATE
USING (auth.uid() = uploader_id);

-- Users can delete their own media
CREATE POLICY "Users can delete their own media"
ON public.jam_media
FOR DELETE
USING (auth.uid() = uploader_id);

-- Create storage bucket for jam media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('jam-media', 'jam-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for jam media
CREATE POLICY "Anyone can view jam media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'jam-media');

CREATE POLICY "Authenticated users can upload jam media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'jam-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own jam media"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'jam-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own jam media"
ON storage.objects
FOR DELETE
USING (bucket_id = 'jam-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Drop the function that exposes addresses since we don't share them anymore
DROP FUNCTION IF EXISTS public.get_profile_with_address(uuid);
DROP FUNCTION IF EXISTS public.has_accepted_booking(uuid);