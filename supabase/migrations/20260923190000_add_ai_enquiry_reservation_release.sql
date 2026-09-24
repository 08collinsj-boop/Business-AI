-- Reliability support for AI enquiry billing reservations.
-- The public enquiry endpoint reserves allowance before a provider call so
-- concurrent requests cannot exceed the plan limit. If the provider or
-- structured-response validation fails, the server can release that specific
-- reservation rather than charging the business for a failed AI turn.
create or replace function public.release_billing_ai_enquiry_allowance(
  p_business_id uuid,
  p_period_started_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_released boolean := false;
begin
  if p_business_id is null or p_period_started_at is null then
    raise exception 'invalid billing allowance release';
  end if;

  update public.business_billing_usage
    set quantity = greatest(quantity - 1, 0),
        updated_at = now()
    where business_id = p_business_id
      and period_started_at = p_period_started_at
      and metric = 'ai_enquiries'
      and quantity > 0
    returning true into v_released;

  return coalesce(v_released, false);
end;
$$;

revoke all on function public.release_billing_ai_enquiry_allowance(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.release_billing_ai_enquiry_allowance(uuid, timestamptz) to service_role;
