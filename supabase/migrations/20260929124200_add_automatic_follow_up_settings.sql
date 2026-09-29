alter table public.business_settings
  add column if not exists automatic_follow_up_enabled boolean not null default false,
  add column if not exists automatic_follow_up_hours integer not null default 24;

alter table public.business_settings
  drop constraint if exists business_settings_automatic_follow_up_hours_check;

alter table public.business_settings
  add constraint business_settings_automatic_follow_up_hours_check
  check (automatic_follow_up_hours in (24, 48, 72));

comment on column public.business_settings.automatic_follow_up_enabled is
  'When enabled, new AI-captured leads receive a private automatic follow-up action for the business team.';

comment on column public.business_settings.automatic_follow_up_hours is
  'Delay in hours before the automatic follow-up action becomes due.';

create unique index if not exists actions_one_pending_automatic_follow_up_idx
  on public.actions (business_id, lead_id)
  where lead_id is not null
    and action_type = 'follow_up'
    and status = 'pending'
    and title = 'Automatic follow-up';
