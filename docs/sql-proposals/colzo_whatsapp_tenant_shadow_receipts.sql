-- REVIEW ONLY: isolated Colzo WhatsApp phase 2. DO NOT APPLY to Pilot or Production.
-- Schema is deliberately restricted to verified tenant sender routing and minimal
-- inbound delivery receipts. No chat text, phone number, provider auth token,
-- customer WhatsApp address or AI-generated content is persisted here.
-- All writes must come from reviewed server-side provider/authenticated flows.

create table if not exists public.whatsapp_provider_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  provider text not null default 'twilio' check (provider = 'twilio'),
  provider_account_sid text not null
    check (provider_account_sid ~ '^AC[0-9a-fA-F]{32}$'),
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'paused', 'revoked')),
  owner_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_connections_verified_owner_check
    check (status <> 'verified' or owner_approved_at is not null),
  constraint whatsapp_connections_id_business_account_unique
    unique (id, business_id, provider_account_sid),
  constraint whatsapp_connections_business_account_unique
    unique (business_id, provider_account_sid)
);

create table if not exists public.whatsapp_sender_bindings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  connection_id uuid not null,
  provider_account_sid text not null
    check (provider_account_sid ~ '^AC[0-9a-fA-F]{32}$'),
  whatsapp_address text not null
    check (whatsapp_address ~ '^whatsapp:\+[1-9][0-9]{6,14}$'),
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'paused', 'revoked')),
  verified_at timestamptz,
  owner_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_sender_binding_connection_fk
    foreign key (connection_id, business_id, provider_account_sid)
    references public.whatsapp_provider_connections (id, business_id, provider_account_sid)
    on delete restrict,
  constraint whatsapp_sender_binding_verified_check
    check (status <> 'verified' or
      (verified_at is not null and owner_approved_at is not null)),
  constraint whatsapp_sender_binding_account_number_unique
    unique (provider_account_sid, whatsapp_address),
  constraint whatsapp_sender_binding_id_business_account_unique
    unique (id, business_id, provider_account_sid)
);

create table if not exists public.whatsapp_inbound_receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  sender_binding_id uuid not null,
  provider_account_sid text not null
    check (provider_account_sid ~ '^AC[0-9a-fA-F]{32}$'),
  message_sid text not null
    check (message_sid ~ '^(SM|MM)[0-9a-fA-F]{32}$'),
  -- Keyed HMAC produced only by future server-side handler. Never plain SHA256
  -- of a phone number (enumerable), never store original customer phone here.
  customer_reference_hmac text not null
    check (customer_reference_hmac ~ '^[0-9a-f]{64}$'),
  state text not null default 'received'
    check (state in ('received', 'needs_human', 'draft_ready', 'ignored')),
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_receipt_sender_tenant_fk
    foreign key (sender_binding_id, business_id, provider_account_sid)
    references public.whatsapp_sender_bindings (id, business_id, provider_account_sid)
    on delete restrict,
  constraint whatsapp_receipt_dedupe_unique
    unique (provider_account_sid, message_sid)
);

create index if not exists whatsapp_connections_business_status_idx
  on public.whatsapp_provider_connections (business_id, status);
create index if not exists whatsapp_sender_business_status_idx
  on public.whatsapp_sender_bindings (business_id, status);
create index if not exists whatsapp_receipts_business_received_idx
  on public.whatsapp_inbound_receipts (business_id, received_at desc);

alter table public.whatsapp_provider_connections enable row level security;
alter table public.whatsapp_sender_bindings enable row level security;
alter table public.whatsapp_inbound_receipts enable row level security;

-- No customer can directly create a verified sender or a fake inbox receipt.
-- The service role bypasses RLS but is restricted to server-side secret storage.
revoke all on public.whatsapp_provider_connections,
  public.whatsapp_sender_bindings, public.whatsapp_inbound_receipts
  from anon, authenticated;
grant select on public.whatsapp_provider_connections,
  public.whatsapp_sender_bindings, public.whatsapp_inbound_receipts
  to authenticated;

drop policy if exists "admins read whatsapp connections"
  on public.whatsapp_provider_connections;
drop policy if exists "admins read whatsapp sender bindings"
  on public.whatsapp_sender_bindings;
drop policy if exists "admins read whatsapp receipts"
  on public.whatsapp_inbound_receipts;

create policy "admins read whatsapp connections"
  on public.whatsapp_provider_connections for select to authenticated
  using (exists (
    select 1 from public.business_memberships membership
    where membership.business_id = whatsapp_provider_connections.business_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('owner', 'admin')
  ));

create policy "admins read whatsapp sender bindings"
  on public.whatsapp_sender_bindings for select to authenticated
  using (exists (
    select 1 from public.business_memberships membership
    where membership.business_id = whatsapp_sender_bindings.business_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('owner', 'admin')
  ));

create policy "admins read whatsapp receipts"
  on public.whatsapp_inbound_receipts for select to authenticated
  using (exists (
    select 1 from public.business_memberships membership
    where membership.business_id = whatsapp_inbound_receipts.business_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('owner', 'admin')
  ));

-- Future provider webhook must use ONE atomic INSERT ON CONFLICT DO NOTHING
-- RETURNING id for (provider_account_sid,message_sid), not read-then-write.
-- Cross-business sender binding is enforced by composite foreign keys above.
-- Before any application: review in an isolated, non-shared Supabase branch,
-- run actual PostgreSQL RLS/unique tests and approve Privacy/DPA retention.
