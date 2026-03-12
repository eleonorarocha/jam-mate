
-- Drop the existing permissive UPDATE policy
DROP POLICY IF EXISTS "Musicians can update their bookings" ON public.bookings;

-- Create a validation trigger that restricts status transitions
CREATE OR REPLACE FUNCTION public.validate_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only the musician can accept or complete a booking
  IF NEW.status IN ('accepted', 'completed') AND OLD.status != NEW.status THEN
    IF auth.uid() != OLD.musician_id THEN
      RAISE EXCEPTION 'Only the musician can accept or complete a booking';
    END IF;
  END IF;

  -- Only the musician can reject a booking
  IF NEW.status = 'rejected' AND OLD.status != NEW.status THEN
    IF auth.uid() != OLD.musician_id THEN
      RAISE EXCEPTION 'Only the musician can reject a booking';
    END IF;
  END IF;

  -- Only the requester or musician can cancel, but only from pending/accepted
  IF NEW.status = 'cancelled' AND OLD.status != NEW.status THEN
    IF OLD.status NOT IN ('pending', 'accepted') THEN
      RAISE EXCEPTION 'Cannot cancel a booking that is not pending or accepted';
    END IF;
  END IF;

  -- Prevent changing status backwards (e.g. completed -> pending)
  IF OLD.status IN ('completed', 'rejected', 'cancelled') AND OLD.status != NEW.status THEN
    RAISE EXCEPTION 'Cannot change status of a finalized booking';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger
DROP TRIGGER IF EXISTS validate_booking_update_trigger ON public.bookings;
CREATE TRIGGER validate_booking_update_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_update();

-- Recreate the UPDATE policy: both parties can update, but the trigger enforces status rules
CREATE POLICY "Musicians can update their bookings"
ON public.bookings
FOR UPDATE
TO public
USING ((auth.uid() = musician_id) OR (auth.uid() = requester_id))
WITH CHECK ((auth.uid() = musician_id) OR (auth.uid() = requester_id));
