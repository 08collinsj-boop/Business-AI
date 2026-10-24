-- STAGED ONLY. Do not apply to Dev or Production before a verified restore and owner approval.
CREATE TABLE public.colzo_pilot_access (
 business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
 activated_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT colzo_pilot_exact_fourteen_days CHECK (expires_at = activated_at + interval '336 hours')
);
ALTER TABLE public.colzo_pilot_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.colzo_pilot_access FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.colzo_pilot_access TO service_role;
COMMENT ON TABLE public.colzo_pilot_access IS 'Manually approved, per-business Colzo trial grants. Not a paid trial.';
