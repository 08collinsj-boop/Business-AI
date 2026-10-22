# Colzo customer portal - database query tenant boundary
21 October 2026. Development-only follow-up to PR #44.

## Security findings

Read-only Dev schema inspection confirmed business_id columns exist on leads, lead_handovers and actions.

The customer portal uses a service-role database client after verifying the current customer bearer token and loading their customer enquiry access grants. PR #44 enforced matching tenant IDs before returning individual enquiries and review links. This follow-up adds the same tenant boundary to **each upstream query** for leads, handovers and review actions, reducing unnecessary data reads even when access grant rows are inconsistent.

The original handover classification also used only lead_id; a deliberately mismatched handover belonging to a different business could incorrectly mark an otherwise received enquiry as "Awaiting business response". A failing-before synthetic test reproduced the issue. The handler now uses a handover only when its business_id exactly matches the referenced lead's business_id.

## Changes and safeguards

- Leads, review actions and handover queries now include the allowed business-ID filter alongside permitted lead IDs.
- Handover rows include business_id in their PostgREST projection so their owner can be checked.
- The response uses only matching lead/business/access tenants (PR #44) and correctly scoped handovers and review actions.
- The existing customer portal fixture now represents the real schema by including handover business_id; no actual database schema or records were changed.
- No account creation, marketing, paid provider calls, customer emails, Production changes, or backups/restores.

## Evidence

- Both new upstream-scope and handover cross-business tests failed against the previous code, then passed after these adjustments.
- Full non-PGlite suite passed 1,157 tests with zero failures/skips, on 182 test files. Build and local security/static checks passed.
- Does not substitute for two independently authenticated real Dev customer/business sessions or full cross-tenant browser acceptance.

Public free beta remains NO-GO pending existing owner-controlled launch gates. The user excluded all backup/recovery work from this task.
