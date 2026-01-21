-- Create blocked_users table
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view their own blocks"
ON public.blocked_users
FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can create their own blocks
CREATE POLICY "Users can create blocks"
ON public.blocked_users
FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks
CREATE POLICY "Users can delete their own blocks"
ON public.blocked_users
FOR DELETE
USING (auth.uid() = blocker_id);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION public.is_blocked(_user_id uuid, _by_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_users
    WHERE blocker_id = _by_user_id AND blocked_id = _user_id
  )
$$;

-- Function to check if there's a mutual block (either direction)
CREATE OR REPLACE FUNCTION public.has_block_between(_user1 uuid, _user2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_users
    WHERE (blocker_id = _user1 AND blocked_id = _user2)
       OR (blocker_id = _user2 AND blocked_id = _user1)
  )
$$;