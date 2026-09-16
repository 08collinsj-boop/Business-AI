# Development database bootstrap

This repository can initialize an empty Supabase project without copying production customer data. The source-controlled chain creates a single placeholder `My Business` settings record, which the tenancy migration converts into the initial Dev tenant. It creates no leads, conversations, or real customer records.

## Migration order

Run these migrations in filename order:

1. `20260911230000_create_initial_lead_schema.sql`
2. `20260911235034_add_lead_status.sql`
3. `20260913233511_add_business_settings.sql`
4. `20260914195529_enable_rls_business_settings.sql`
5. `20260915000000_add_multi_tenant_auth.sql`
6. `20260915010000_add_bookings_actions.sql`
7. `20260916153249_add_voice_receptionist_foundation.sql`
8. `20260916154907_add_voice_foreign_key_indexes.sql`
9. `20260916170000_add_business_configuration_onboarding.sql`
10. `20260916180000_add_business_creation_and_public_routes.sql`

The resulting schema contains `leads`, `lead_history`, `business_settings`, `businesses`, `business_memberships`, `bookings`, `actions`, the provider-neutral voice foundation tables, tenant-scoped `business_configurations`, and server-owned `business_public_routes`, with RLS and tenant-safe foreign-key relationships.

## Current Dev status

On 2026-09-16, all ten migrations were applied to **Business-AI-Dev** (`mvwseobgkexzpmmkgcxe`) and verified with the Supabase CLI. The Dev project has its own owner and clearly fake end-to-end lead, booking, action, and history data. The four voice foundation tables exist but contain no provider connection, phone number, credential, call, or event. Every Dev business has one blank, tenant-scoped business configuration row and one public slug route. This record applies only to Business-AI-Dev; it does not indicate any Production database change.

## Dev-only onboarding

After the migrations succeed, create a real test user in **Business-AI-Dev Auth**. Obtain that user's UID and insert an `owner` membership for the sole Dev business. Do not use the Production owner UID or any real customer data.

```sql
insert into public.business_memberships (business_id, user_id, role)
select business_id, '<DEV_AUTH_USER_UUID>'::uuid, 'owner'
from public.business_settings
order by id
limit 1
on conflict (business_id, user_id) do update set role = excluded.role;
```

Then configure only Vercel Preview with the Dev project's Supabase URL, server-only service-role key, and browser-safe publishable key. Keep Production variables pointed at the existing/main project and leave both Production auth gates unchanged.

## Post-migration verification

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('leads', 'lead_history', 'business_settings', 'businesses', 'business_memberships', 'bookings', 'actions')
order by tablename;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.bookings'::regclass, 'public.actions'::regclass)
order by table_name, conname;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('bookings', 'actions')
order by tablename, policyname;
```

For the broader booking/action integrity checks, use [Bookings and actions](BOOKINGS_ACTIONS.md).
