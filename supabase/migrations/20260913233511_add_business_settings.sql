-- Historical production migration, source-controlled for fresh Dev bootstrap.
create table if not exists public.business_settings (
  id bigint primary key generated always as identity,
  business_name text not null default 'My Business',
  business_type text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  opening_hours text not null default '',
  services text not null default '',
  ai_instructions text not null default '',
  urgent_jobs_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.business_settings (business_name)
select 'My Business'
where not exists (select 1 from public.business_settings);
