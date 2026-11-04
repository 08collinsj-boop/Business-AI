-- PROPOSAL ONLY. Separate exact SQL approval required for Business-AI-Dev.
-- No data rewrite, grant edit, extension, new role or Production operation.
-- One business is one scheduling resource during this pilot.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
LOCK TABLE public.bookings IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.colzo_pilot_access IN SHARE MODE;
DO $preflight$
BEGIN
 IF current_user <> 'postgres' OR session_user <> 'postgres' THEN
  RAISE EXCEPTION 'Expected Development migration operator';
 END IF;
 IF EXISTS (
  SELECT 1 FROM public.bookings a JOIN public.bookings b
   ON a.business_id=b.business_id AND a.id<b.id
  JOIN public.colzo_pilot_access p ON p.business_id=a.business_id
  WHERE a.status='confirmed' AND b.status='confirmed'
   AND a.starts_at IS NOT NULL AND a.ends_at IS NOT NULL
   AND b.starts_at IS NOT NULL AND b.ends_at IS NOT NULL
   AND a.starts_at < b.ends_at AND b.starts_at < a.ends_at
 ) THEN RAISE EXCEPTION 'Existing pilot booking overlaps require owner review; no automatic repair'; END IF;
END
$preflight$;

CREATE FUNCTION public.colzo_pilot_confirmed_booking_guard()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = '' SET row_security = off SET lock_timeout = '3s'
AS $$
BEGIN
 -- Preserve legacy non-pilot behavior, cancellations and ordinary notes edits.
 IF NEW.status IS DISTINCT FROM 'confirmed'
  OR NEW.starts_at IS NULL OR NEW.ends_at IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.business_id IS NOT DISTINCT FROM OLD.business_id
   AND NEW.status IS NOT DISTINCT FROM OLD.status
   AND NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at
   AND NEW.ends_at IS NOT DISTINCT FROM OLD.ends_at THEN RETURN NEW; END IF;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.colzo_pilot_access p
   WHERE p.business_id=NEW.business_id) THEN RETURN NEW; END IF;
 -- A VOLATILE query after the lock sees newly committed rows at READ COMMITTED.
 -- Fixed-snapshot isolation must fail closed instead of missing a waited writer.
 IF pg_catalog.current_setting('transaction_isolation') <> 'read committed' THEN
  RAISE EXCEPTION 'Pilot booking scheduling requires read committed isolation' USING ERRCODE='40001';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'colzo-pilot-confirmed-booking:' || NEW.business_id::text, 0));
 IF NEW.ends_at <= NEW.starts_at THEN
  RAISE EXCEPTION 'Invalid pilot booking interval' USING ERRCODE='22023';
 END IF;
 IF EXISTS (SELECT 1 FROM public.bookings b
  WHERE b.business_id=NEW.business_id AND b.id IS DISTINCT FROM NEW.id
   AND b.status='confirmed' AND b.starts_at IS NOT NULL AND b.ends_at IS NOT NULL
   AND b.starts_at < NEW.ends_at AND NEW.starts_at < b.ends_at) THEN
  RAISE EXCEPTION 'Pilot confirmed booking time conflict' USING ERRCODE='23P01';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.colzo_pilot_confirmed_booking_guard()
 FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER colzo_pilot_confirmed_booking_guard
 BEFORE INSERT OR UPDATE ON public.bookings
 FOR EACH ROW EXECUTE FUNCTION public.colzo_pilot_confirmed_booking_guard();
COMMIT;
