alter table public.marketing_automation_settings
  add column if not exists posts_per_day smallint not null default 1,
  add column if not exists last_content_angle text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.marketing_automation_settings'::regclass
      and conname = 'marketing_automation_settings_posts_per_day_check'
  ) then
    alter table public.marketing_automation_settings
      add constraint marketing_automation_settings_posts_per_day_check
      check (posts_per_day between 1 and 3);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.marketing_automation_settings'::regclass
      and conname = 'marketing_automation_settings_last_content_angle_check'
  ) then
    alter table public.marketing_automation_settings
      add constraint marketing_automation_settings_last_content_angle_check
      check (
        last_content_angle is null
        or last_content_angle = any (array[
          'services'::text,
          'completed_work'::text,
          'advice'::text,
          'trust'::text,
          'offers'::text,
          'business_knowledge'::text
        ])
      );
  end if;
end $$;
