-- Public business profile media and presentation fields.
-- Uploads use short-lived signed tokens created by the authenticated server.
-- The bucket is public only for serving approved profile/banner media.

alter table public.business_settings
  add column if not exists profile_image_path text not null default '',
  add column if not exists profile_banner_path text not null default '';

do $$ begin
  alter table public.business_settings add constraint business_settings_profile_image_path_length check (char_length(profile_image_path) <= 700);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.business_settings add constraint business_settings_profile_banner_path_length check (char_length(profile_banner_path) <= 700);
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-profile-media',
  'business-profile-media',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
