# Dev database catalogue spot-check - 17 October 2026

**Method:** authorised Supabase read-only catalogue SELECT queries against
project `mvwseobgkexzpmmkgcxe`. No business/customer rows were retrieved,
no records modified, no migrations run, and no backup/restore attempted.

## Confirmed live properties

| Table | Row-level security | anon SELECT grant | authenticated SELECT grant |
| --- | --- | --- | --- |
| `colzo_clients` | Enabled | No | No |
| `colzo_projects` | Enabled | No | No |
| `colzo_quotes` | Enabled | No | No |
| `colzo_whatsapp_demo_threads` | Enabled | No | Yes, subject to its RLS policies |

There are 15 reported constraints across Projects and Quotes, including
business_id foreign keys, primary keys, field checks, and two composite
enquiry-tenant foreign keys. Current Postgres returned:

- `colzo_projects_lead_tenant_fkey`: `FOREIGN KEY (lead_id, business_id) REFERENCES leads(id, business_id) ON DELETE RESTRICT`
- `colzo_quotes_lead_tenant_fkey`: `FOREIGN KEY (lead_id, business_id) REFERENCES leads(id, business_id) ON DELETE RESTRICT`

These are server/database safeguards in addition to the application API
validation added in draft PR #21. Existing RLS security-advisor INFO
findings for server-only tables must not be cleared by opening public policies.

**Not verified here:** actual RLS policy body and behavior for every role;
all Postgres schema objects, migrations and indexes; Auth MFA sessions,
backup integrity, storage-object contents, restore safety and Production.
The Dev-only WhatsApp SELECT grant is intentional in the archived source,
but its policy restrictions require a separate authorised access test before
any broader rollout. It must not be deployed to Pilot/Production.

## Release decision

Migration source is recovered and these specific Dev catalogue properties
match their historic intent. This is only a partial schema spot-check,
**not** proof that Dev can be rebuilt or Production can launch.

Public release remains **NO-GO** pending validated automatic migration
source, a verified restorable backup, segregated restore drill, owner
approvals and Work's authenticated functional QA.
