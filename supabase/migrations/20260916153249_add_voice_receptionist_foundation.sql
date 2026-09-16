-- Provider-neutral voice receptionist foundation.
--
-- This migration creates tenant-owned routing and audit records only. It does
-- not create a phone number, provider account, call, recording, or customer
-- data. Provider credentials remain server-side environment configuration and
-- must never be stored in these tables.

create table if not exists public.voice_provider_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  provider text not null check (provider in ('twilio', 'telnyx', 'vonage', 'custom')),
  provider_account_reference text not null check (length(trim(provider_account_reference)) > 0),
  webhook_secret_reference text not null default '',
  status text not null default 'disabled'
    check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'disabled' or length(trim(webhook_secret_reference)) > 0),
  unique (id, business_id),
  unique (business_id, provider, provider_account_reference)
);

create table if not exists public.voice_phone_numbers (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete restrict,
  provider_connection_id uuid not null,
  e164_number text not null check (e164_number ~ '^\\+[1-9][0-9]{7,14}$'),
  provider_number_reference text not null default '',
  location_label text not null default '',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_phone_numbers_connection_business_fkey
    foreign key (provider_connection_id, business_id)
    references public.voice_provider_connections (id, business_id)
    on delete restrict,
  unique (e164_number),
  unique (id, business_id)
);

-- The existing actions table is also linked to calls through a composite key,
-- so a call cannot be associated with an action from another business.
create unique index if not exists actions_id_business_id_idx
  on public.actions (id, business_id);

create table if not exists public.voice_calls (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete restrict,
  phone_number_id bigint,
  provider_connection_id uuid,
  provider_call_id text not null,
  direction text not null default 'inbound'
    check (direction in ('inbound', 'outbound')),
  status text not null default 'received'
    check (status in ('received', 'ringing', 'in_progress', 'completed', 'missed', 'failed', 'escalated')),
  caller_number text not null default ''
    check (caller_number = '' or caller_number ~ '^\\+[1-9][0-9]{7,14}$'),
  called_number text not null default ''
    check (called_number = '' or called_number ~ '^\\+[1-9][0-9]{7,14}$'),
  lead_id bigint,
  booking_id bigint,
  action_id bigint,
  handover_status text not null default 'not_requested'
    check (handover_status in ('not_requested', 'requested', 'connected', 'failed')),
  escalation_reason text not null default '',
  transcript_summary text not null default '',
  recording_reference text not null default '',
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  provider_cost_minor bigint not null default 0 check (provider_cost_minor >= 0),
  ai_input_tokens integer not null default 0 check (ai_input_tokens >= 0),
  ai_output_tokens integer not null default 0 check (ai_output_tokens >= 0),
  currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_calls_phone_number_business_fkey
    foreign key (phone_number_id, business_id)
    references public.voice_phone_numbers (id, business_id)
    on delete restrict,
  constraint voice_calls_connection_business_fkey
    foreign key (provider_connection_id, business_id)
    references public.voice_provider_connections (id, business_id)
    on delete restrict,
  constraint voice_calls_lead_business_fkey
    foreign key (lead_id, business_id)
    references public.leads (id, business_id)
    on delete restrict,
  constraint voice_calls_booking_business_fkey
    foreign key (booking_id, business_id)
    references public.bookings (id, business_id)
    on delete restrict,
  constraint voice_calls_action_business_fkey
    foreign key (action_id, business_id)
    references public.actions (id, business_id)
    on delete restrict,
  constraint voice_calls_time_check
    check (ended_at is null or started_at is null or ended_at >= started_at),
  unique (id, business_id),
  unique (provider_connection_id, provider_call_id)
);

create table if not exists public.voice_call_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete restrict,
  call_id bigint not null,
  event_type text not null
    check (event_type in ('provider_event', 'caller_turn', 'assistant_turn', 'lead_linked', 'booking_requested', 'action_created', 'handover_requested', 'emergency_escalated', 'call_completed')),
  speaker text not null default 'system'
    check (speaker in ('caller', 'assistant', 'system')),
  content text not null default '',
  provider_event_id text not null default '',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint voice_call_events_call_business_fkey
    foreign key (call_id, business_id)
    references public.voice_calls (id, business_id)
    on delete restrict,
  unique (call_id, provider_event_id)
);

create index if not exists voice_provider_connections_business_status_idx
  on public.voice_provider_connections (business_id, status);
create index if not exists voice_phone_numbers_connection_active_idx
  on public.voice_phone_numbers (provider_connection_id, active);
create index if not exists voice_calls_business_started_at_idx
  on public.voice_calls (business_id, started_at desc);
create index if not exists voice_calls_business_status_idx
  on public.voice_calls (business_id, status, started_at desc);
create index if not exists voice_calls_business_lead_id_idx
  on public.voice_calls (business_id, lead_id);
create index if not exists voice_call_events_business_call_occurred_idx
  on public.voice_call_events (business_id, call_id, occurred_at asc);

alter table public.voice_provider_connections enable row level security;
alter table public.voice_phone_numbers enable row level security;
alter table public.voice_calls enable row level security;
alter table public.voice_call_events enable row level security;

-- Anonymous callers receive no direct database access. Authenticated users can
-- only read call records for their own business; provider configuration and
-- number routing are restricted to owner/admin memberships. All writes remain
-- server-authorized after webhook verification or authenticated API checks.
revoke all on public.voice_provider_connections, public.voice_phone_numbers,
  public.voice_calls, public.voice_call_events from anon, authenticated;
grant select on public.voice_provider_connections, public.voice_phone_numbers,
  public.voice_calls, public.voice_call_events to authenticated;

drop policy if exists "admins read voice provider connections" on public.voice_provider_connections;
drop policy if exists "admins read voice phone numbers" on public.voice_phone_numbers;
drop policy if exists "members read voice calls" on public.voice_calls;
drop policy if exists "members read voice call events" on public.voice_call_events;

create policy "admins read voice provider connections"
  on public.voice_provider_connections for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = voice_provider_connections.business_id
        and membership.user_id = (select auth.uid())
        and membership.role in ('owner', 'admin')
    )
  );

create policy "admins read voice phone numbers"
  on public.voice_phone_numbers for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = voice_phone_numbers.business_id
        and membership.user_id = (select auth.uid())
        and membership.role in ('owner', 'admin')
    )
  );

create policy "members read voice calls"
  on public.voice_calls for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = voice_calls.business_id
        and membership.user_id = (select auth.uid())
    )
  );

create policy "members read voice call events"
  on public.voice_call_events for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = voice_call_events.business_id
        and membership.user_id = (select auth.uid())
    )
  );
