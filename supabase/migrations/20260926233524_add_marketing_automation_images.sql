-- Pilot AI Marketing automation and image-generation foundation.
-- Approval-required remains the default. Fully automated publishing is owner controlled.
-- Image generation defaults to simulation in application configuration, so this schema
-- does not itself enable paid provider usage.

create table if not exists public.marketing_automation_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  enabled boolean not null default false,
  mode text not null default 'approval_required'
    check (mode in ('approval_required','fully_automated')),
  platform text not null default 'facebook'
    check (platform = 'facebook'),
  tone text not null default 'friendly'
    check (tone in ('professional','friendly','casual','promotional')),
  image_enabled boolean not null default false,
  cadence text not null default 'daily'
    check (cadence = 'daily'),
  last_run_at timestamptz,
  last_status text
    check (last_status is null or last_status in ('draft_created','published','failed')),
  last_error_code text
    check (last_error_code is null or char_length(last_error_code) <= 120),
  last_generation_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketing_automation_settings enable row level security;
revoke all on public.marketing_automation_settings from anon, authenticated;
grant select on public.marketing_automation_settings to authenticated;
grant all on public.marketing_automation_settings to service_role;

create policy "members read own marketing automation settings"
  on public.marketing_automation_settings for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = marketing_automation_settings.business_id
        and membership.user_id = (select auth.uid())
    )
  );

create table if not exists public.marketing_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  generation_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending','simulated','completed','failed')),
  provider text not null
    check (provider in ('simulation','openai')),
  model text check (model is null or char_length(model) <= 160),
  prompt text not null check (char_length(prompt) between 1 and 8000),
  storage_bucket text not null default 'marketing-images'
    check (storage_bucket = 'marketing-images'),
  storage_path text check (storage_path is null or char_length(storage_path) <= 1000),
  mime_type text check (mime_type is null or mime_type in ('image/jpeg','image/png','image/webp')),
  width integer check (width is null or width between 256 and 4096),
  height integer check (height is null or height between 256 and 4096),
  provider_image_id text check (provider_image_id is null or char_length(provider_image_id) <= 300),
  failure_code text check (failure_code is null or char_length(failure_code) <= 120),
  failure_message text check (failure_message is null or char_length(failure_message) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint marketing_images_generation_business_fkey
    foreign key (generation_id, business_id)
    references public.marketing_generations(id, business_id)
    on delete cascade,
  unique (business_id, generation_id),
  unique (id, business_id),
  check (
    status <> 'completed'
    or (storage_path is not null and mime_type is not null and completed_at is not null)
  )
);

create index if not exists marketing_images_business_created_idx
  on public.marketing_images (business_id, created_at desc);

alter table public.marketing_images enable row level security;
revoke all on public.marketing_images from anon, authenticated;
grant select on public.marketing_images to authenticated;
grant all on public.marketing_images to service_role;

create policy "members read own marketing image metadata"
  on public.marketing_images for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships membership
      where membership.business_id = marketing_images.business_id
        and membership.user_id = (select auth.uid())
    )
  );

-- Private bucket: the server creates short-lived signed URLs only when an
-- authenticated user previews an image or Meta needs to fetch it for publishing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-images',
  'marketing-images',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
