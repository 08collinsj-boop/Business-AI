-- Pilot launch observability: aggregate operational counters only.
-- The function is intentionally server-only and never returns customer content
-- or identifiers. It is safe to use from operator tooling with service_role.

create or replace function public.get_platform_ops_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'generated_at', now(),
    'leads_24h', (select count(*) from public.leads where created_at >= now() - interval '24 hours'),
    'marketing_generations_24h', (select count(*) from public.marketing_generations where created_at >= now() - interval '24 hours'),
    'marketing_generation_statuses_24h', coalesce((
      select jsonb_object_agg(status_key, total)
      from (
        select coalesce(nullif(status, ''), 'unknown') as status_key, count(*)::bigint as total
        from public.marketing_generations
        where created_at >= now() - interval '24 hours'
        group by 1
      ) s
    ), '{}'::jsonb),
    'marketing_publications_24h', (select count(*) from public.marketing_publications where created_at >= now() - interval '24 hours'),
    'marketing_publication_statuses_24h', coalesce((
      select jsonb_object_agg(status_key, total)
      from (
        select coalesce(nullif(status, ''), 'unknown') as status_key, count(*)::bigint as total
        from public.marketing_publications
        where created_at >= now() - interval '24 hours'
        group by 1
      ) s
    ), '{}'::jsonb),
    'marketing_publication_failure_codes_24h', coalesce((
      select jsonb_object_agg(code_key, total)
      from (
        select coalesce(nullif(failure_code, ''), 'unspecified') as code_key, count(*)::bigint as total
        from public.marketing_publications
        where created_at >= now() - interval '24 hours'
          and coalesce(status, '') in ('failed', 'error')
        group by 1
      ) s
    ), '{}'::jsonb),
    'marketing_image_events_24h', (select count(*) from public.marketing_image_usage_events where created_at >= now() - interval '24 hours'),
    'billing_usage_31d', coalesce((
      select jsonb_object_agg(metric, total)
      from (
        select metric, sum(quantity)::bigint as total
        from public.business_billing_usage
        where updated_at >= now() - interval '31 days'
        group by metric
      ) s
    ), '{}'::jsonb),
    'active_knowledge_items', (select count(*) from public.business_knowledge_items where status = 'active'),
    'knowledge_items_awaiting_review', (select count(*) from public.business_knowledge_items where status in ('pending', 'review', 'review_required'))
  );
$$;

revoke all on function public.get_platform_ops_snapshot() from public, anon, authenticated;
grant execute on function public.get_platform_ops_snapshot() to service_role;

comment on function public.get_platform_ops_snapshot() is
  'Server-only aggregate launch monitoring snapshot. Returns counts/statuses only and no customer content or identifiers.';
