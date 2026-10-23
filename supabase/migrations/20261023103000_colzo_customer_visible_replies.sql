-- Development-only candidate. Do not run against Production without rollout approval.
-- Durable customer-visible owner replies. All access is through verified server endpoints.
begin;
set local lock_timeout='2s';
set local statement_timeout='10s';
create table if not exists public.customer_visible_replies (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 lead_id bigint not null references public.leads(id) on delete cascade,
 created_by uuid not null,
 request_id uuid not null,
 body text not null check (char_length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now(),
 unique (business_id, request_id)
);
create index if not exists customer_visible_replies_lead_idx
 on public.customer_visible_replies(business_id,lead_id,created_at);
alter table public.customer_visible_replies enable row level security;
drop policy if exists customer_visible_replies_server_only on public.customer_visible_replies;
create policy customer_visible_replies_server_only on public.customer_visible_replies
 for all to anon, authenticated using (false) with check (false);
revoke all on public.customer_visible_replies from public, anon, authenticated;
-- The application service role enforces customer grants and business membership.
-- No direct anonymous or authenticated Supabase client writes are permitted.
commit;
