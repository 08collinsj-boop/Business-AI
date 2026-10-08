-- PILOT ONLY: an already-approved draft must not be scheduled repeatedly.
CREATE UNIQUE INDEX IF NOT EXISTS pilot_marketing_publications_one_active_draft_slot
  ON public.marketing_publications (business_id, generation_id, platform, scheduled_for)
  WHERE status IN ('scheduled', 'publishing', 'published');

CREATE UNIQUE INDEX IF NOT EXISTS pilot_marketing_schedules_one_active_draft_slot
  ON public.marketing_schedules (business_id, marketing_generation_id, platform, scheduled_for)
  WHERE status IN ('scheduled', 'processing', 'posted');
