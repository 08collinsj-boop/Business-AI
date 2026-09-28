-- Allow owner-uploaded photos in the existing private Marketing image pipeline.
alter table public.marketing_images
  drop constraint if exists marketing_images_provider_check;

alter table public.marketing_images
  add constraint marketing_images_provider_check
  check (provider in ('simulation','openai','cloudflare','upload'));
