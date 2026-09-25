CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Hourly expiry of unpaid bookings: cancels bookings stuck in
-- 'pending'/'awaiting_payment' past expires_at and releases their seats
-- atomically via _release_bookings. Idempotent: expire_stale_bookings()
-- uses FOR UPDATE SKIP LOCKED and only touches expired unpaid rows, so
-- repeat runs are safe. Paid/confirmed bookings are never matched.
SELECT cron.schedule(
  'expire-stale-bookings',
  '0 * * * *',
  $$SELECT public.expire_stale_bookings()$$
)
WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-bookings'
);