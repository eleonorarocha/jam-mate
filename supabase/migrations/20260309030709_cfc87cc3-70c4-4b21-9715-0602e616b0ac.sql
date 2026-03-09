
-- Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS: users can see their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- RLS: admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read ALL feedback
CREATE POLICY "Admins can view all feedback"
ON public.feedback FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete feedback
CREATE POLICY "Admins can delete feedback"
ON public.feedback FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add a status column to feedback for management
ALTER TABLE public.feedback ADD COLUMN status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.feedback ADD COLUMN admin_notes text;

-- Allow admins to update feedback (status, notes)
CREATE POLICY "Admins can update feedback"
ON public.feedback FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
