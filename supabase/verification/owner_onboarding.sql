-- Run only AFTER 20260915000000_add_multi_tenant_auth.sql succeeds.
-- Verified real owner UID; never replace with an invented value.
begin;

with initial_business as (
  select b.id
  from public.businesses b
  join public.business_settings s on s.business_id = b.id
  order by s.id
  limit 1
)
insert into public.business_memberships (business_id, user_id, role)
select id, 'aac022a4-48db-47a7-823e-bdc710fb1a48'::uuid, 'owner'
from initial_business
on conflict (business_id, user_id) do update set role = excluded.role;

-- Must return one owner membership, bound to the initial business.
select b.id, b.name, m.user_id, m.role
from public.businesses b
join public.business_memberships m on m.business_id = b.id
where m.user_id = 'aac022a4-48db-47a7-823e-bdc710fb1a48'::uuid;
commit;
