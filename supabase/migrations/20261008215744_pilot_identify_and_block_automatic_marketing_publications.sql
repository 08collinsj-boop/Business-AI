-- PILOT ONLY: capture publication provenance and deny unattended posts.
-- Direct owner-approved publications remain valid (default false).
ALTER TABLE public.marketing_publications
  ADD COLUMN IF NOT EXISTS is_automated boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.marketing_publications'::regclass
      AND conname = 'pilot_marketing_no_unattended_publications'
  ) THEN
    ALTER TABLE public.marketing_publications
      ADD CONSTRAINT pilot_marketing_no_unattended_publications
        CHECK (is_automated IS FALSE);
  END IF;
END $$;
