-- Owner-controlled customer-directory discoverability.
-- Existing and new businesses remain listed by default for compatibility.
alter table public.business_settings
  add column if not exists directory_search_enabled boolean not null default true;

comment on column public.business_settings.directory_search_enabled is
  'When false, omit the business from public directory search while keeping its direct public route active.';
