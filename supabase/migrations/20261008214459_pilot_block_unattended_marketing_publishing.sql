-- PILOT ONLY: stop all full-autopublish configurations until explicitly certified.
-- This does not disable approval-required automation or manual publishing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.marketing_automation_settings'::regclass
      AND conname = 'pilot_prevent_fully_automated_publishing'
  ) THEN
    ALTER TABLE public.marketing_automation_settings
      ADD CONSTRAINT pilot_prevent_fully_automated_publishing
        CHECK (NOT (enabled AND mode = 'fully_automated'));
  END IF;
END $$;
