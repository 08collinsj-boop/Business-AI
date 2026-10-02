-- Private reusable media libraries for AI Marketing automation.
-- Post photos may be copied onto automated posts; inspiration photos are style references only.

create table if not exists public.marketing_automation_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  role text not null check (role in ('post','inspiration')),
  file_name text not null check (char_length(file_name) between 1 and 240),
  storage_bucket text not null default 'marketing-images' check (storage_bucket = 'marketing-images'),
  storage_path text not null check (char_length(storage_path) between 1 and 1000),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  visual_context text check (visual_context is null or char_length(visual_context) <= 700),
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id, storage_path)
);

create index if not exists marketing_automation_media_business_role_idx
  on public.marketing_automation_media (business_id, role, last_used_at, created_at);

alter table public.marketing_automation_media enable row level security;
revoke all on public.marketing_automation_media from anon, authenticated;
grant all on public.marketing_automation_media to service_role;

comment on table public.marketing_automation_media is
  'Server-managed private automation media. role=post may be copied to a generated post; role=inspiration is never published directly.';
comment on column public.marketing_automation_media.visual_context is
  'Cautious AI visual description. It is visual context only and is never trusted business knowledge.';
