-- Make the server-only access model explicit and cover the created_by foreign key.

create index if not exists marketing_automation_media_created_by_idx
  on public.marketing_automation_media (created_by);

drop policy if exists "server only deny direct access" on public.marketing_automation_media;
create policy "server only deny direct access"
  on public.marketing_automation_media
  for all
  to anon, authenticated
  using (false)
  with check (false);
