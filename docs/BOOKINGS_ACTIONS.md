# Bookings and actions

## What this milestone adds

The forward-only migration `20260915010000_add_bookings_actions.sql` adds tenant-owned `bookings` and `actions` tables. It has **not** been applied to Supabase by this source change.

- A booking can be linked to a lead, or created manually without one.
- An action can be linked to a lead and/or booking, or be a standalone business task.
- Composite foreign keys require any linked lead or booking to belong to the same business as the new record.
- Both tables use membership-based RLS for direct authenticated reads. Direct anonymous access and direct authenticated writes are denied; server APIs use the service role only after server-side membership resolution.

## Apply the migration

Before enabling the interface in any environment, review and apply the migration through the normal Supabase migration workflow. It creates new tables only and does not alter, delete, or backfill existing leads, lead history, settings, businesses, or memberships.

After applying it, verify:

```sql
select count(*) from public.bookings;
select count(*) from public.actions;

select count(*) as invalid_booking_leads
from public.bookings booking
left join public.leads lead
  on lead.id = booking.lead_id
 and lead.business_id = booking.business_id
where booking.lead_id is not null and lead.id is null;

select count(*) as invalid_action_links
from public.actions action
left join public.leads lead
  on lead.id = action.lead_id
 and lead.business_id = action.business_id
left join public.bookings booking
  on booking.id = action.booking_id
 and booking.business_id = action.business_id
where (action.lead_id is not null and lead.id is null)
   or (action.booking_id is not null and booking.id is null);
```

The two integrity queries should return `0`.

## API and permission model

`/api/bookings` and `/api/actions` require `TENANCY_AUTH_ENABLED === "true"` and a valid Supabase session with exactly one server-resolved `business_memberships` row. When the tenant gate is off, the new APIs safely return `503` rather than exposing unscoped data.

All reads, lookups, inserts, and updates use the server-derived `businessId`. Request values for `business_id`, role, and other internal columns are rejected by allowlists. A cross-tenant ID behaves as a safe not-found result.

Current MVP members may create and update bookings/actions for their business; configuration remains owner/admin-only through the existing settings API. Any linked lead or booking is checked against the same tenant before the operation.

Meaningful changes to a linked lead also create a best-effort `lead_history` activity record. Failure to add optional activity history never rolls back a valid booking/action operation.

## AI and future integrations

The receptionist remains public and is deliberately not connected to these write endpoints in this milestone. It cannot silently create a confirmed appointment. Future AI, messaging, or phone integrations should create `bookings` with `status = 'requested'` and `source = 'ai_request'`, then require a business-controlled availability/rules workflow before changing a booking to `confirmed`.

Future integrations may use the same server-side service layer to create follow-up actions. They must resolve a tenant from a trusted integration/widget/domain configuration, never from a public browser-supplied `business_id`.
