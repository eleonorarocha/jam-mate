-- First, update any existing profiles with 'other' or 'prefer_not_to_say' to NULL temporarily
UPDATE public.profiles 
SET gender = NULL 
WHERE gender IN ('other', 'prefer_not_to_say');

-- Create new enum type with only male and female
CREATE TYPE public.gender_type_new AS ENUM ('male', 'female');

-- Alter the column to use the new type
ALTER TABLE public.profiles 
ALTER COLUMN gender TYPE public.gender_type_new 
USING gender::text::public.gender_type_new;

-- Drop the old enum type
DROP TYPE public.gender_type;

-- Rename the new type to the original name
ALTER TYPE public.gender_type_new RENAME TO gender_type;