-- Business Knowledge Uploads
-- Private source documents are uploaded to Supabase Storage using short-lived
-- signed upload tokens issued only after server-side membership/role checks.
-- Extracted facts must be reviewed before either receptionist or Marketing may use them.

create table if not exists public.business_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  replaces_source_id uuid references public.business_knowledge_sources(id) on delete set null,
  file_name text not null check (char_length(file_name) between 1 and 240),
  storage_path text not null unique check (char_length(storage_path) between 1 and 700),
  mime_type text not null check (mime_type in (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv'
  )),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending_upload' check (status in (
    'pending_upload','processing','needs_review','active','failed','superseded'
  )),
  extracted_summary text not null default '' check (char_length(extracted_summary) <= 4000),
  error_message text not null default '' check (char_length(error_message) <= 1000),
  extracted_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);

create index if not exists business_knowledge_sources_business_created_idx
  on public.business_knowledge_sources (business_id, created_at desc);
create index if not exists business_knowledge_sources_business_status_idx
  on public.business_knowledge_sources (business_id, status);
create unique index if not exists business_knowledge_sources_active_hash_idx
  on public.business_knowledge_sources (business_id, sha256)
  where sha256 is not null and status in ('needs_review','active');

create table if not exists public.business_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  business_id uuid not null,
  item_type text not null check (item_type in (
    'product','service','price','hours','policy','faq','contact','location','dietary','other'
  )),
  title text not null check (char_length(title) between 1 and 300),
  content text not null check (char_length(content) between 1 and 3000),
  keywords jsonb not null default '[]'::jsonb
    check (jsonb_typeof(keywords) = 'array' and jsonb_array_length(keywords) <= 20),
  status text not null default 'needs_review' check (status in (
    'needs_review','active','rejected','superseded'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_knowledge_items_source_business_fkey
    foreign key (source_id, business_id)
    references public.business_knowledge_sources(id, business_id)
    on delete cascade
);

create index if not exists business_knowledge_items_business_status_idx
  on public.business_knowledge_items (business_id, status);
create index if not exists business_knowledge_items_source_idx
  on public.business_knowledge_items (source_id, created_at);

alter table public.business_knowledge_sources enable row level security;
alter table public.business_knowledge_items enable row level security;

revoke all on public.business_knowledge_sources, public.business_knowledge_items from anon, authenticated;
grant select on public.business_knowledge_sources, public.business_knowledge_items to authenticated;
grant all on public.business_knowledge_sources, public.business_knowledge_items to service_role;

create policy "members read own knowledge sources"
  on public.business_knowledge_sources for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = business_knowledge_sources.business_id
        and membership.user_id = (select auth.uid())
    )
  );

create policy "members read own knowledge items"
  on public.business_knowledge_items for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = business_knowledge_items.business_id
        and membership.user_id = (select auth.uid())
    )
  );

-- Storage stays private. Browser clients receive only short-lived signed upload
-- tokens from the authenticated server; they have no general direct bucket policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-knowledge',
  'business-knowledge',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv'
  ]::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
