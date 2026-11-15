-- New ClickUp integration storage for Colzo. REVIEW ONLY: do not apply without SQL approval.
-- The browser roles receive no SELECT or write access to encrypted connection rows.
create table if not exists public.colzo_clickup_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique check (state_hash ~ '^[a-f0-9]{64}$'),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists colzo_clickup_oauth_expiry_idx
  on public.colzo_clickup_oauth_states(expires_at);
alter table public.colzo_clickup_oauth_states enable row level security;
revoke all on public.colzo_clickup_oauth_states from anon,authenticated;
grant all on public.colzo_clickup_oauth_states to service_role;

create table if not exists public.colzo_clickup_connections (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  connected_by uuid references auth.users(id) on delete set null,
  status text not null default 'connected' check (status in ('connected','needs_reauth')),
  workspace_id text not null check(workspace_id ~ '^[1-9][0-9]{0,19}$'),
  workspace_name text not null check(char_length(workspace_name) between 1 and 120),
  available_workspaces jsonb not null default '[]'::jsonb
    check(jsonb_typeof(available_workspaces)='array' and jsonb_array_length(available_workspaces)<=50),
  token_ciphertext text not null check(char_length(token_ciphertext) between 16 and 20000),
  token_iv text not null check(char_length(token_iv) between 8 and 200),
  token_tag text not null check(char_length(token_tag) between 8 and 200),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.colzo_clickup_connections enable row level security;
revoke all on public.colzo_clickup_connections from anon,authenticated;
grant all on public.colzo_clickup_connections to service_role;

