-- Versioned legal acceptance records for the Business AI UK Pilot.
-- Account terms are user-level; the DPA is accepted once by the business owner.

create table if not exists public.user_legal_acceptances (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_key text not null check (document_key in ('terms','privacy','acceptable_use')),
  document_version text not null check (char_length(document_version) between 1 and 40),
  source text not null default 'web' check (source in ('web')),
  accepted_at timestamptz not null default now(),
  unique (user_id, document_key, document_version)
);

create index if not exists user_legal_acceptances_user_idx
  on public.user_legal_acceptances (user_id, accepted_at desc);

create table if not exists public.business_legal_acceptances (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  document_key text not null check (document_key in ('dpa')),
  document_version text not null check (char_length(document_version) between 1 and 40),
  source text not null default 'web' check (source in ('web')),
  accepted_at timestamptz not null default now(),
  unique (business_id, document_key, document_version)
);

create index if not exists business_legal_acceptances_business_idx
  on public.business_legal_acceptances (business_id, accepted_at desc);

alter table public.user_legal_acceptances enable row level security;
alter table public.business_legal_acceptances enable row level security;

revoke all on public.user_legal_acceptances, public.business_legal_acceptances from anon, authenticated;
grant all on public.user_legal_acceptances, public.business_legal_acceptances to service_role;
