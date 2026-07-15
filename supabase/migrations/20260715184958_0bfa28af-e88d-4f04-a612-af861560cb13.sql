
-- Table
CREATE TABLE IF NOT EXISTS public.booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_events_booking_id_idx ON public.booking_events(booking_id, created_at);

GRANT SELECT, INSERT ON public.booking_events TO authenticated;
GRANT ALL ON public.booking_events TO service_role;

ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking parties can view events"
ON public.booking_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_events.booking_id
      AND (b.requester_id = auth.uid() OR b.musician_id = auth.uid())
  )
);

-- Trigger function: log status transitions and creation
CREATE OR REPLACE FUNCTION public.log_booking_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_events (booking_id, event_type, actor_id, reason)
    VALUES (NEW.id, 'requested', NEW.requester_id, NEW.message);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_events (booking_id, event_type, actor_id, reason)
    VALUES (
      NEW.id,
      NEW.status::text,
      auth.uid(),
      CASE WHEN NEW.status = 'cancelled' THEN NEW.cancellation_reason ELSE NULL END
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_events_insert ON public.bookings;
CREATE TRIGGER booking_events_insert
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_booking_event();

DROP TRIGGER IF EXISTS booking_events_update ON public.bookings;
CREATE TRIGGER booking_events_update
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_booking_event();

-- Backfill for existing bookings
INSERT INTO public.booking_events (booking_id, event_type, actor_id, reason, created_at)
SELECT b.id, 'requested', b.requester_id, b.message, b.created_at
FROM public.bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM public.booking_events e
  WHERE e.booking_id = b.id AND e.event_type = 'requested'
);

INSERT INTO public.booking_events (booking_id, event_type, actor_id, reason, created_at)
SELECT b.id, b.status::text, NULL,
       CASE WHEN b.status::text = 'cancelled' THEN b.cancellation_reason ELSE NULL END,
       b.updated_at
FROM public.bookings b
WHERE b.status::text IN ('accepted','rejected','cancelled','completed')
  AND NOT EXISTS (
    SELECT 1 FROM public.booking_events e
    WHERE e.booking_id = b.id AND e.event_type = b.status::text
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_events;
