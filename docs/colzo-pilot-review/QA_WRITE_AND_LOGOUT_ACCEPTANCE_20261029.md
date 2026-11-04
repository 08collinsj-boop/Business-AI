# QA save, stale-write and logout acceptance — 29 October 2026

**Secure real-business pilot: NO-GO.** Starting PR head 95399e738c9559983faec5c26552b4fd3e00daf9. Existing protected Preview/runtime retained. No code defect was established; no runtime change or broad suite rerun.

## New actual UI write and persisted readback

After the owner instructed continuing independently toward pilot readiness, created exactly one clearly fictional customer through the normal authenticated QA UI:
- name: QA Rowan Example — TEST ONLY 20261029;
- QA business: 433f135d-720f-4687-8114-3dffe7361675;
- customer ID independently returned by Development read-only inspection: 08f9a189-8b40-433b-b783-f0718463aa2d;
- no phone/email supplied; no outgoing message, booking, enquiry or real service created.

UI changed to Record created and one saved customer. A complete page reload followed by Customers finished loading the same single record. Read-only SQL independently returned exactly that named customer in the QA business, created_at 2026-10-29 11:45:33.481907+00. SQL evidence: log_8l5i7u9PWLhV. Empty contact fields were stored as text rather than NULL; no contact details were invented.

## Two-tab stale-edit check: actual browser behaviour passed

Both tabs used the SAME QA identity/session; this is not two-business isolation.

1. Tab A opened Edit Customer and retained the original loaded version; changed only fictional notes to a STALE TAB A marker.
2. Tab B loaded the same saved customer and edited notes to an ACCEPTED TAB B marker.
3. Tab B saved and the UI showed Changes saved.
4. Tab A submitted its stale version. The UI returned **This record has changed. Reload it before saving.** and kept the unsaved Tab A notes in the form.
5. Independent SELECT returned accepted_edit_preserved=true and updated_at=2026-10-29 11:47:26.243+00 for the exact QA customer (log_Id_E8eAG7sFm).
6. Cancel opened the normal Unsaved changes dialog; Discard changes returned to the customer list without modifying the accepted saved record.

This proves the observed browser rejection/draft preservation and persisted winner. No network inspector/status was available, so do not label HTTP 409 as directly captured; source inspection of lib/colzo-records-handler.js associates that exact stale-version response with 409.

The saved note is explicitly fictional: Fictional QA record. ACCEPTED TAB B edit — preserve this when a stale Tab A save is rejected. No real person or outgoing contact.

## Actual QA logout: passed

Used normal Sign out before switching accounts. Both existing QA tabs transitioned to Welcome back. Fresh read-only Development query found **qa_sessions=0 and qa_refresh_token_rows=0**, evidence log_gnEMHHZWO7qJ. This is real UI/session-removal evidence, not raw retained-JWT/refresh-token replay or grant revocation.

## Fresh identity evidence corrects older MFA snapshots

Read-only mapping query (log_Q8Bppx3nOU25):
- original demonstration owner 936c9261-af30-4516-9b69-d2d85e1905f2 / 08collinsj@gmail.com -> business 6da33602-1b8f-474d-84a6-e003d1c713fd, owner, **one verified MFA factor**;
- QA owner b8cb079d-792e-4810-8218-0f9d442c521a / 08collinsj+colzoqa@gmail.com -> QA business above, owner, **zero verified MFA factors**.

The original owner's one factor is new fresh evidence superseding earlier zero-factor snapshots for THAT identity only. It does not establish an AAL2 browser session, nor MFA on QA.

Normal secure browserAuth sign-in was attempted once for the exact original demonstration address. Secret values were never returned to or inspected by the agent. browserAuth reported submitted, but fresh visible UI displayed **Unable to sign in with those details.** Thus sign-in is NOT a pass. No reset, account change, alternate-identity substitution, administrative session generation, authentication bypass or repeat credential retry was performed.

## Fresh public legal endpoint

Normal browser navigation to /api/legal-public on the approved Preview returned blank operator_name, trading_name, operator_type, operator_address, contact_email, contact_phone, company_number, vat_number and identity_configured=false. No identity/contact was invented or published.

## Vital remaining steps

- Legitimate original demonstration sign-in/challenge on the existing account, followed by independent AAL2 verification; QA enrollment remains deferred by owner request.
- Two-business issued-JWT/API populated own/foreign read and write acceptance, raw business-ID replay, AAL1 denial/AAL2 success and raw stale-token replay remain incomplete. UI empty-list observations and SQL role simulation are not substitutes.
- Exact corrected live QA revoke still needs prerequisites, fresh preflight and separate exact-byte approval. Current corrected proposal SHA256 is 1bfb70bc564989f529d4c9bb0c448dcba7dd666c3c5e31d8c26675554ba427d3; not applied here.
- True live expiry remains untested: existing grants expire on 10/11 November; timestamps were not shortened to manufacture a pass. Post-revoke denial is also pending.
- Exact publishable operator identity/address/contact and final lifecycle/terms decisions remain unresolved; see OPERATOR_LIFECYCLE_INPUTS_20261028.md. Full backup/restore retains the earlier owner deferral, with no recovery promise.

No real business/customer data was modified. Only the single named fictional QA customer was created/updated; existing records, grants, permissions, Auth configuration, SSO, Production and paid providers were preserved. No merge, deployment, invitation, real pilot activation, live revoke or charge.
