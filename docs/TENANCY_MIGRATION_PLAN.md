# Tenancy migration plan

Do not apply `20260915000000_add_multi_tenant_auth.sql` until owner onboarding and server API authorization are deployed.

## Preservation preflight

Before and after migration, run:

```sql
select (select count(*) from public.leads) leads,
       (select count(*) from public.lead_history) lead_history,
       (select count(*) from public.business_settings) business_settings,
       (select count(*) from public.leads where business_id is null) leads_without_business,
       (select count(*) from public.lead_history where business_id is null) history_without_business;
```

Expected after backfill: `9, 7, 1, 0, 0`.

## Owner onboarding

1. Create the real owner with Supabase Auth (email/password or magic link).
2. Copy that Auth user's UUID from the Supabase dashboard.
3. As an administrator, insert one membership for the initial business with role `owner`.
4. Configure the production site URL and Auth redirect URLs in Supabase Auth.
5. Deploy server-side session verification before allowing dashboard access.
