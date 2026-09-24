-- Pilot marketing library, Meta connection/publishing foundation and tester feedback.
-- All privileged writes continue through server routes using the service role.

alter table public.marketing_generations
  add column if not exists edited_output jsonb,
  add column if not exists approval_status text not null default 'draft',
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.marketing_generations
  drop constraint if exists marketing_generations_approval_status_check;
alter table public.marketing_generations
  add constraint marketing_generations_approval_status_check
  check (approval_status in ('draft','approved'));

alter table public.marketing_generations
  drop constraint if exists marketing_generations_edited_output_check;
alter table public.marketing_generations
  add constraint marketing_generations_edited_output_check
  check (edited_output is null or (jsonb_typeof(edited_output) = 'object' and octet_length(edited_output::text) <= 16000));

alter table public.marketing_generations
  drop constraint if exists marketing_generations_approval_consistency_check;
alter table public.marketing_generations
  add constraint marketing_generations_approval_consistency_check
  check (
    (approval_status = 'draft' and approved_at is null and approved_by is null)
    or
    (approval_status = 'approved' and approved_at is not null and approved_by is not null and status = 'completed')
  );

create index if not exists marketing_generations_business_library_idx
  on public.marketing_generations (business_id, deleted_at, created_at desc);

create table if not exists public.marketing_meta_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique check (state_hash ~ '^[a-f0-9]{64}$'),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index if not exists marketing_meta_oauth_states_expiry_idx on public.marketing_meta_oauth_states (expires_at);
alter table public.marketing_meta_oauth_states enable row level security;
revoke all on public.marketing_meta_oauth_states from anon, authenticated;
grant all on public.marketing_meta_oauth_states to service_role;

create table if not exists public.marketing_meta_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  connected_by uuid references auth.users(id) on delete set null,
  provider text not null default 'meta' check (provider = 'meta'),
  status text not null default 'connected' check (status in ('connected','needs_reauth','disconnected')),
  token_ciphertext text not null check (char_length(token_ciphertext) between 16 and 20000),
  token_iv text not null check (char_length(token_iv) between 8 and 200),
  token_tag text not null check (char_length(token_tag) between 8 and 200),
  token_expires_at timestamptz,
  scopes jsonb not null default '[]'::jsonb check (jsonb_typeof(scopes) = 'array' and jsonb_array_length(scopes) <= 40),
  provider_user_id text check (provider_user_id is null or char_length(provider_user_id) <= 200),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);
create index if not exists marketing_meta_connections_status_idx on public.marketing_meta_connections (business_id, status);
alter table public.marketing_meta_connections enable row level security;
revoke all on public.marketing_meta_connections from anon, authenticated;
grant all on public.marketing_meta_connections to service_role;
-- Deliberately expose no token-bearing row through authenticated Data API policies.

create table if not exists public.marketing_social_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  connection_id uuid not null,
  platform text not null check (platform in ('facebook','instagram')),
  provider_account_id text not null check (char_length(provider_account_id) between 1 and 200),
  display_name text not null default '' check (char_length(display_name) <= 300),
  linked_page_provider_id text check (linked_page_provider_id is null or char_length(linked_page_provider_id) <= 200),
  token_ciphertext text check (token_ciphertext is null or char_length(token_ciphertext) between 16 and 20000),
  token_iv text check (token_iv is null or char_length(token_iv) between 8 and 200),
  token_tag text check (token_tag is null or char_length(token_tag) between 8 and 200),
  selected boolean not null default false,
  status text not null default 'available' check (status in ('available','selected','needs_reauth','disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_social_accounts_connection_business_fkey
    foreign key (connection_id, business_id)
    references public.marketing_meta_connections(id, business_id)
    on delete cascade,
  unique (business_id, platform, provider_account_id),
  unique (id, business_id)
);
create unique index if not exists marketing_social_accounts_one_selected_platform_idx
  on public.marketing_social_accounts (business_id, platform) where selected;
create index if not exists marketing_social_accounts_connection_idx on public.marketing_social_accounts (connection_id, business_id);
alter table public.marketing_social_accounts enable row level security;
revoke all on public.marketing_social_accounts from anon, authenticated;
grant select (id,business_id,connection_id,platform,provider_account_id,display_name,linked_page_provider_id,selected,status,created_at,updated_at)
  on public.marketing_social_accounts to authenticated;
grant all on public.marketing_social_accounts to service_role;
create policy "members read own marketing social accounts" on public.marketing_social_accounts
for select to authenticated using (
  exists (
    select 1 from public.business_memberships m
    where m.business_id = marketing_social_accounts.business_id
      and m.user_id = (select auth.uid())
  )
);

create table if not exists public.marketing_publications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  generation_id uuid not null,
  social_account_id uuid not null,
  platform text not null check (platform in ('facebook','instagram')),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 120),
  status text not null default 'scheduled' check (status in ('scheduled','publishing','published','failed','cancelled')),
  scheduled_for timestamptz not null,
  claimed_at timestamptz,
  published_at timestamptz,
  provider_post_id text check (provider_post_id is null or char_length(provider_post_id) <= 300),
  failure_code text check (failure_code is null or char_length(failure_code) <= 120),
  failure_message text check (failure_message is null or char_length(failure_message) <= 500),
  attempts integer not null default 0 check (attempts between 0 and 10),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_publications_generation_business_fkey
    foreign key (generation_id, business_id)
    references public.marketing_generations(id, business_id)
    on delete cascade,
  constraint marketing_publications_account_business_fkey
    foreign key (social_account_id, business_id)
    references public.marketing_social_accounts(id, business_id)
    on delete restrict,
  unique (business_id, idempotency_key),
  unique (id, business_id)
);
create index if not exists marketing_publications_due_idx on public.marketing_publications (status, scheduled_for);
create index if not exists marketing_publications_business_created_idx on public.marketing_publications (business_id, created_at desc);
alter table public.marketing_publications enable row level security;
revoke all on public.marketing_publications from anon, authenticated;
grant select on public.marketing_publications to authenticated;
grant all on public.marketing_publications to service_role;
create policy "members read own marketing publications" on public.marketing_publications
for select to authenticated using (
  exists (
    select 1 from public.business_memberships m
    where m.business_id = marketing_publications.business_id
      and m.user_id = (select auth.uid())
  )
);

create or replace function public.claim_due_marketing_publications(p_limit integer default 10)
returns setof public.marketing_publications
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_limit < 1 or p_limit > 50 then
    raise exception 'invalid claim limit';
  end if;
  return query
  with due as (
    select id
    from public.marketing_publications
    where status = 'scheduled'
      and scheduled_for <= now()
      and attempts < 10
    order by scheduled_for asc
    for update skip locked
    limit p_limit
  )
  update public.marketing_publications p
  set status = 'publishing',
      claimed_at = now(),
      attempts = attempts + 1,
      updated_at = now(),
      failure_code = null,
      failure_message = null
  from due
  where p.id = due.id
  returning p.*;
end $$;
revoke all on function public.claim_due_marketing_publications(integer) from public, anon, authenticated;
grant execute on function public.claim_due_marketing_publications(integer) to service_role;

-- Claim one known scheduled publication atomically. This is used for an
-- owner-requested "publish now" and for explicit safe retries, avoiding a race
-- with the scheduler. The service route has already tenant-authorised the row.
create or replace function public.claim_marketing_publication(p_business_id uuid, p_publication_id uuid)
returns public.marketing_publications
language plpgsql
security invoker
set search_path = public
as $$
declare
  claimed public.marketing_publications;
begin
  update public.marketing_publications p
  set status = 'publishing',
      claimed_at = now(),
      attempts = attempts + 1,
      updated_at = now(),
      failure_code = null,
      failure_message = null
  where p.business_id = p_business_id
    and p.id = p_publication_id
    and p.status = 'scheduled'
    and p.attempts < 10
  returning p.* into claimed;
  return claimed;
end $$;
revoke all on function public.claim_marketing_publication(uuid,uuid) from public, anon, authenticated;
grant execute on function public.claim_marketing_publication(uuid,uuid) to service_role;

create table if not exists public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('bug','confusing','ai_accuracy','missing_feature','suggestion')),
  page text not null default 'unknown' check (char_length(page) between 1 and 80),
  message text not null check (char_length(message) between 3 and 3000),
  app_version text not null default '' check (char_length(app_version) <= 120),
  status text not null default 'new' check (status in ('new','reviewed','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pilot_feedback_business_created_idx on public.pilot_feedback (business_id, created_at desc);
alter table public.pilot_feedback enable row level security;
revoke all on public.pilot_feedback from anon, authenticated;
grant select on public.pilot_feedback to authenticated;
grant all on public.pilot_feedback to service_role;
create policy "owners and admins read own pilot feedback" on public.pilot_feedback
for select to authenticated using (
  exists (
    select 1 from public.business_memberships m
    where m.business_id = pilot_feedback.business_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','admin')
  )
);

-- Stripe webhook ordering: stale subscription events must never overwrite newer state.
alter table public.business_billing_accounts
  add column if not exists last_stripe_event_created_at timestamptz;

create or replace function public.sync_business_billing_from_stripe(
  p_business_id uuid,
  p_event_created_at timestamptz,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_plan text,
  p_status text,
  p_current_period_started_at timestamptz,
  p_current_period_ends_at timestamptz,
  p_cancel_at_period_end boolean,
  p_cancelled_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_business_id is null or p_event_created_at is null then return false; end if;
  insert into public.business_billing_accounts(
    business_id,stripe_customer_id,stripe_subscription_id,plan,status,
    current_period_started_at,current_period_ends_at,cancel_at_period_end,cancelled_at,
    last_stripe_event_created_at,updated_at
  ) values (
    p_business_id,p_stripe_customer_id,p_stripe_subscription_id,p_plan,p_status,
    p_current_period_started_at,p_current_period_ends_at,coalesce(p_cancel_at_period_end,false),p_cancelled_at,
    p_event_created_at,now()
  )
  on conflict (business_id) do update set
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.business_billing_accounts.stripe_customer_id),
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.business_billing_accounts.stripe_subscription_id),
    plan = excluded.plan,
    status = excluded.status,
    current_period_started_at = excluded.current_period_started_at,
    current_period_ends_at = excluded.current_period_ends_at,
    cancel_at_period_end = excluded.cancel_at_period_end,
    cancelled_at = excluded.cancelled_at,
    last_stripe_event_created_at = excluded.last_stripe_event_created_at,
    updated_at = now()
  where public.business_billing_accounts.last_stripe_event_created_at is null
     or public.business_billing_accounts.last_stripe_event_created_at <= excluded.last_stripe_event_created_at;
  return found;
end $$;
revoke all on function public.sync_business_billing_from_stripe(uuid,timestamptz,text,text,text,text,timestamptz,timestamptz,boolean,timestamptz)
  from public, anon, authenticated;
grant execute on function public.sync_business_billing_from_stripe(uuid,timestamptz,text,text,text,text,timestamptz,timestamptz,boolean,timestamptz)
  to service_role;
