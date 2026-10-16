-- DEVELOPMENT ONLY: synthetic WhatsApp inbox fixtures. Never migrate or deploy to Production/Pilot.
-- Isolated from provider connections and real customer data. No phone numbers or outbound messages.
-- Apply only to verified development Supabase project mvwseobgkexzpmmkgcxe after review.
create table if not exists public.colzo_whatsapp_demo_threads (
 business_id uuid not null references public.businesses(id) on delete cascade,
 fixture_key text not null check (fixture_key in ('demo-a', 'demo-b', 'demo-c')),
 customer_label text not null check (char_length(customer_label) between 1 and 80),
 tag text not null check (char_length(tag) between 1 and 80),
 messages jsonb not null check (jsonb_typeof(messages) = 'array'
    and jsonb_array_length(messages) between 1 and 4
    and length(messages::text) <= 4000),
 draft text check (draft is null or char_length(draft) <= 900),
 state text not null default 'review' check (state in ('review','human')),
 synthetic boolean not null default true check (synthetic),
 received_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (business_id, fixture_key),
 constraint colzo_whatsapp_human_has_no_draft
   check (state <> 'human' or draft is null)
);
create index if not exists colzo_wa_demo_tenant_recent_idx
 on public.colzo_whatsapp_demo_threads(business_id,received_at desc);

alter table public.colzo_whatsapp_demo_threads enable row level security;
revoke all on public.colzo_whatsapp_demo_threads from anon, authenticated;
grant select on public.colzo_whatsapp_demo_threads to authenticated;
create policy "colzo whatsapp admin read synthetic demo"
 on public.colzo_whatsapp_demo_threads for select to authenticated
 using (exists (
  select 1 from public.business_memberships membership
  where membership.business_id = colzo_whatsapp_demo_threads.business_id
   and membership.user_id = (select auth.uid())
   and membership.role in ('owner', 'admin')
 ));
comment on table public.colzo_whatsapp_demo_threads is
 'Development fixtures only. No real WhatsApp messages, numbers, provider activity or sends.';
