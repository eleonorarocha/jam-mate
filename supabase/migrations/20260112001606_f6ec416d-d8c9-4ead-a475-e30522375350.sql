-- Create gender enum type
CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- Add gender column to profiles (public field)
ALTER TABLE public.profiles 
ADD COLUMN gender public.gender_type;