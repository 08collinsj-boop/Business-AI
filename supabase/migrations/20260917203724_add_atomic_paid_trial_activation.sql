-- A paid trial can be activated exactly once per business, including when two
-- distinct Checkout completion events arrive concurrently.
create or replace function public.activate_paid_business_trial(
  p_business_id uuid,
  p_stripe_customer_id text,
  p_started_at timestamptz,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activated boolean := false;
begin
  if p_business_id is null or p_started_at is null or p_expires_at is null or p_expires_at <= p_started_at then
    raise exception 'invalid paid trial request';
  end if;
  insert into public.business_billing_accounts (
    business_id, stripe_customer_id, plan, status, trial_purchased,
    trial_started_at, trial_expires_at, current_period_started_at,
    current_period_ends_at, updated_at
  ) values (
    p_business_id, p_stripe_customer_id, 'trial', 'active', true,
    p_started_at, p_expires_at, p_started_at, p_expires_at, now()
  ) on conflict (business_id) do update
    set stripe_customer_id = coalesce(excluded.stripe_customer_id, public.business_billing_accounts.stripe_customer_id),
        plan = 'trial', status = 'active', trial_purchased = true,
        trial_started_at = excluded.trial_started_at, trial_expires_at = excluded.trial_expires_at,
        current_period_started_at = excluded.current_period_started_at,
        current_period_ends_at = excluded.current_period_ends_at,
        cancel_at_period_end = false, cancelled_at = null, updated_at = now()
    where not public.business_billing_accounts.trial_purchased
  returning true into v_activated;
  return coalesce(v_activated, false);
end;
$$;
revoke all on function public.activate_paid_business_trial(uuid, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.activate_paid_business_trial(uuid, text, timestamptz, timestamptz) to service_role;
