-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Idempotent (re)scheduling of the booking reminders job
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-booking-reminders') THEN
    PERFORM cron.unschedule('send-booking-reminders');
  END IF;

  PERFORM cron.schedule(
    'send-booking-reminders',
    '*/5 * * * *',
    $job$
  SELECT
    net.http_post(
      url := 'https://gmlwpcadioqwqirplxlo.supabase.co/functions/v1/send-booking-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtbHdwY2FkaW9xd3FpcnBseGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODczMDcsImV4cCI6MjA3ODk2MzMwN30.uDaD80sQEvIjoh9mCT0loiNSwstzGNs5dI7l8dJGirg"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
    $job$
  );
END
$do$;