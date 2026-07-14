
CREATE OR REPLACE FUNCTION public.get_musician_busy_slots(_musician_id uuid)
RETURNS TABLE(scheduled_date timestamptz, duration_hours integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.scheduled_date, b.duration_hours
  FROM public.bookings b
  WHERE b.musician_id = _musician_id
    AND b.status IN ('pending', 'accepted')
    AND b.scheduled_date >= (now() - interval '1 day')
$$;

GRANT EXECUTE ON FUNCTION public.get_musician_busy_slots(uuid) TO authenticated;
