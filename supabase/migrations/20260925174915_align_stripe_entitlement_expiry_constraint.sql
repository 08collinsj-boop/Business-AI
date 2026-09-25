-- Active Stripe access follows the verified base subscription period.
-- Keep a mandatory provider reference; do not change RLS, grants or tenant keys.
alter table public.business_feature_entitlements drop constraint stripe_requires_expiry;
alter table public.business_feature_entitlements add constraint stripe_requires_reference
  check (source <> 'stripe' or source_reference is not null);
