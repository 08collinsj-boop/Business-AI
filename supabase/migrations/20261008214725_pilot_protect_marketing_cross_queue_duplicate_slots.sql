-- PILOT ONLY: make it impossible to schedule the same draft at the same time
-- in both the direct publication queue and the native Meta calendar.
CREATE OR REPLACE FUNCTION public.pilot_block_cross_queue_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_generation uuid;
  v_lock_key text;
BEGIN
  IF TG_TABLE_NAME = 'marketing_publications' THEN
    IF NEW.status NOT IN ('scheduled','publishing','published') THEN RETURN NEW; END IF;
    v_generation := NEW.generation_id;
  ELSE
    IF NEW.status NOT IN ('scheduled','processing','posted') THEN RETURN NEW; END IF;
    v_generation := NEW.marketing_generation_id;
  END IF;
  v_lock_key := NEW.business_id::text || ':' || v_generation::text || ':' ||
                NEW.platform || ':' || extract(epoch from NEW.scheduled_for)::text;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_lock_key, 0));

  IF TG_TABLE_NAME = 'marketing_publications' THEN
    IF EXISTS (
      SELECT 1 FROM public.marketing_schedules AS schedule
      WHERE schedule.business_id = NEW.business_id
        AND schedule.marketing_generation_id = v_generation
        AND schedule.platform = NEW.platform
        AND schedule.scheduled_for = NEW.scheduled_for
        AND (schedule.status IN ('scheduled','posted')
             OR (schedule.status = 'processing' AND schedule.native_scheduled IS TRUE))
    ) THEN
      RAISE EXCEPTION 'This draft is already scheduled through the Marketing calendar'
        USING ERRCODE = '23505', CONSTRAINT = 'pilot_cross_queue_draft_slot';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.marketing_publications AS publication
      WHERE publication.business_id = NEW.business_id
        AND publication.generation_id = v_generation
        AND publication.platform = NEW.platform
        AND publication.scheduled_for = NEW.scheduled_for
        AND publication.status IN ('scheduled','publishing','published')
    ) THEN
      RAISE EXCEPTION 'This draft is already queued for Marketing publication'
        USING ERRCODE = '23505', CONSTRAINT = 'pilot_cross_queue_draft_slot';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pilot_publications_cross_queue_guard ON public.marketing_publications;
CREATE TRIGGER pilot_publications_cross_queue_guard
BEFORE INSERT OR UPDATE OF status, scheduled_for, generation_id, platform ON public.marketing_publications
FOR EACH ROW EXECUTE FUNCTION public.pilot_block_cross_queue_duplicate();

DROP TRIGGER IF EXISTS pilot_schedules_cross_queue_guard ON public.marketing_schedules;
CREATE TRIGGER pilot_schedules_cross_queue_guard
BEFORE INSERT OR UPDATE OF status, scheduled_for, marketing_generation_id, platform ON public.marketing_schedules
FOR EACH ROW EXECUTE FUNCTION public.pilot_block_cross_queue_duplicate();

REVOKE ALL ON FUNCTION public.pilot_block_cross_queue_duplicate() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pilot_block_cross_queue_duplicate() TO service_role;
