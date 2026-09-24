-- Pilot operations: owner-authorised staff invitations and durable handover
-- records. Additive only; existing tenant data is preserved.

create unique index if not exists actions_id_business_id_idx
  on public.actions (id, business_id);

create table if not exists public.business_team_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  invited_email text not null check (invited_email = lower(trim(invited_email)))
    check (char_length(invited_email) between 3 and 320),
  role text not null check (role in ('admin', 'member')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete restrict,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'accepted') = (accepted_by is not null and accepted_at is not null))
);
create unique index if not exists business_team_invitations_active_email_idx
  on public.business_team_invitations (business_id, invited_email)
  where status = 'pending';
create index if not exists business_team_invitations_business_status_idx
  on public.business_team_invitations (business_id, status, created_at desc);

alter table public.business_team_invitations enable row level security;
revoke all on public.business_team_invitations from anon, authenticated;
grant select on public.business_team_invitations to authenticated;
drop policy if exists "owners read team invitations" on public.business_team_invitations;
create policy "owners read team invitations"
  on public.business_team_invitations for select to authenticated
  using (exists (
    select 1 from public.business_memberships membership
    where membership.business_id = business_team_invitations.business_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
  ));

-- The server verifies both the session and the recipient email before calling
-- this function. It never accepts a client-supplied tenant or role.
create or replace function public.accept_business_team_invitation(
  p_invitation_id uuid,
  p_user_id uuid,
  p_email text
)
returns table (business_id uuid, role text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invitation public.business_team_invitations%rowtype;
begin
  if p_invitation_id is null or p_user_id is null or p_email is null then
    raise exception 'invalid invitation';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id and lower(email) = lower(trim(p_email))) then
    raise exception 'invalid recipient';
  end if;
  if exists (select 1 from public.business_memberships where user_id = p_user_id) then
    raise exception 'user already belongs to a business';
  end if;
  select * into invitation from public.business_team_invitations
    where id = p_invitation_id and status = 'pending' and expires_at > now()
    for update;
  if not found or invitation.invited_email <> lower(trim(p_email)) then
    raise exception 'invitation unavailable';
  end if;
  insert into public.business_memberships (business_id, user_id, role)
    values (invitation.business_id, p_user_id, invitation.role);
  update public.business_team_invitations
    set status = 'accepted', accepted_by = p_user_id, accepted_at = now(), updated_at = now()
    where id = invitation.id;
  return query select invitation.business_id, invitation.role;
end;
$$;
revoke all on function public.accept_business_team_invitation(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.accept_business_team_invitation(uuid, uuid, text) to service_role;

create table if not exists public.lead_handovers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  lead_id bigint not null,
  action_id bigint,
  reason text not null check (reason in ('human_requested', 'complaint_or_dispute', 'emergency_or_high_risk', 'sensitive_or_unusual', 'ai_uncertain')),
  summary text not null default '' check (char_length(summary) <= 2000),
  status text not null default 'requires_attention'
    check (status in ('requires_attention', 'acknowledged', 'resolved')),
  acknowledged_by uuid references auth.users(id) on delete restrict,
  acknowledged_at timestamptz,
  resolved_by uuid references auth.users(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_handovers_lead_business_fkey
    foreign key (lead_id, business_id) references public.leads (id, business_id) on delete restrict,
  constraint lead_handovers_action_business_fkey
    foreign key (action_id, business_id) references public.actions (id, business_id) on delete restrict
);
create index if not exists lead_handovers_business_status_created_idx
  on public.lead_handovers (business_id, status, created_at desc);
create index if not exists lead_handovers_business_lead_idx
  on public.lead_handovers (business_id, lead_id, created_at desc);

alter table public.lead_handovers enable row level security;
revoke all on public.lead_handovers from anon, authenticated;
grant select on public.lead_handovers to authenticated;
drop policy if exists "members read lead handovers" on public.lead_handovers;
create policy "members read lead handovers"
  on public.lead_handovers for select to authenticated
  using (exists (
    select 1 from public.business_memberships membership
    where membership.business_id = lead_handovers.business_id
      and membership.user_id = (select auth.uid())
 ));
