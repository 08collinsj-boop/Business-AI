-- Ensure every business created after the pilot-hardening migration receives
-- the same conservative lifecycle defaults as existing businesses.

create or replace function public.create_default_business_data_lifecycle_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_data_lifecycle_policies (business_id)
  values (new.id)
  on conflict (business_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_default_business_data_lifecycle_policy() from public, anon, authenticated;

drop trigger if exists businesses_create_default_lifecycle_policy on public.businesses;
create trigger businesses_create_default_lifecycle_policy
  after insert on public.businesses
  for each row
  execute function public.create_default_business_data_lifecycle_policy();
