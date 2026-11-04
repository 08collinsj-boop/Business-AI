# Protected Preview redeployment and legal acceptance — 29 October 2026

**Demonstration: usable with existing fictional data; the new origin's authenticated UI still needs private sign-in. Secure 14-day real-business pilot: NO-GO.**

## Exact deployment

Owner explicitly approved redeploying runtime `adecce31b88f5c1ffd623480524996cb5ae91581` only. Composio VERCEL_CREATE_NEW_DEPLOYMENT redeployed existing `dpl_DE8GfJEB2B77XpzZaSnWvjbxc6L5` once, without a production target or different source SHA (log_5SvwlQYKvMIC).

- New deployment: `dpl_WFU7RH8EJWTX28Ej3zUVSEtrXgo4`.
- New immutable protected Preview: https://business-cqef9gbgk-buisness-ai1.vercel.app/
- Branch alias: https://business-ai-git-fix-colzo-pilot-release-gat-63d24f-buisness-ai1.vercel.app/
- Git source independently read back as exact approved SHA and branch; READY, alias assigned, target=null, environment=preview; crons=[] (log_bsZIHpD0l4U7).
- Original URL https://business-1xljgk1nb-buisness-ai1.vercel.app/ still denotes the previous immutable deployment. It is not the legal-settings redeployment.
- Initial PR head `0dcda00612aee6968f24ac2ff772af5ebb8b043f`, open/draft/unmerged. Latest 42 commits read; the latest two were export and legal documentation.

## New checks actually passed

1. All seven branch-only encrypted legal variables exist: LEGAL_OPERATOR_NAME, LEGAL_TRADING_NAME, LEGAL_OPERATOR_TYPE, LEGAL_OPERATOR_ADDRESS, LEGAL_OPERATOR_ADDRESS_PUBLIC_CONFIRMED, LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_PHONE. Individual source and destination reads found all seven match the original Business AI Production values except the approved trading-name substitution Colzo. Canonical target SHA256 remains `4f9526546640b4edcbbedc782150e3f9b80c49283edcd85793144029b8fcf01e` (log_rJ0vMPZWkeGm). No personal address/telephone is copied into this evidence.
2. Running new-origin /api/legal-public displays trading_name=Colzo, operator_type=sole_trader, identity_configured=true, populated original identity/contact fields and blank company/VAT fields. All seven legal variable names also appear in deployment environment metadata. The address is displayed under the retained public-consent flag.
3. Normal browser rendering passed for Legal centre, Terms v1.2, Privacy v1.1, DPA v1.1, Acceptable Use v1.1, Storage v1.1, Service Providers v1.3 and data-deletion instructions dated 20 October. Waited for dynamic Service provider identity before assessing results. Initial static unconfigured notices are replaced after identity loads; they were not counted as defects. No legal document content/version was edited and no agreement was accepted.
4. Legal centre accurately describes user Terms/AUP/Privacy acceptance and business-owner DPA acceptance. Read-only Dev readback retains original user acceptances dated 15 October and QA Terms v1.2/Privacy v1.1/AUP v1.1 dated 28 October 22:45:06.721289Z. Original business DPA v1.1 remains dated 20 October. QA business has **no DPA acceptance**; do not infer one from onboarding or user terms (log_kb1bKbCOmXQk).
5. New-origin /api/public-config points to Business-AI-Dev mvwseobgkexzpmmkgcxe; frontend auth=true, pilot approval required, duration=14 days, cardRequired=false and automaticConversion=false.
6. Vercel project retains SSO all_except_custom_domains. A separate credential-free external request to the new legal API received HTTP 302 to Vercel login, proving Preview protection still applies outside the authorised browser. No share/bypass link was created. No public exposure was enabled (log_qCV1gbagCIVD).
7. All environment entries in both projects match their first post-deployment snapshots; original legal source values also match the prior recorded transformed canonical digest. This is a bounded comparison, not a predeployment database-wide snapshot. Billing, voice, Meta publish and marketing autopublish=false; AI/Stripe/scheduler secrets remain blank in this branch. Billing is disabled, with no Stripe key or payment request; no live Stripe operation was performed. Production target IDs remain business-ai dpl_B1pREw9u11SF5XJ8guv2zh8Dhd4X and original Business AI Pilot dpl_6aTd232EYYZDRH1y3ypZuwaE97xS (log_3C-GcgRpTrV8).
8. New-origin /?auth=recovery without a recovery session displays the invalid/expired-link error. No password entered, email sent or recovery accepted.

## Retained security evidence and exact limits

Fresh read-only Dev metadata: original owner has one verified factor and three sessions, all AAL2; QA has zero factors and zero sessions. Both existing grants remain active with unchanged expiry: original 10 November 18:08:54.676335Z; QA 11 November 22:50:58.480174Z (log_kb1bKbCOmXQk).

The original old-origin browser session is reusable and its dashboard loaded existing 4 enquiries, 5 bookings and 2 open actions. It was preserved; no logout or record write was performed. This does not establish a signed-in session on the new origin.

Earlier native PostgreSQL, regression, clock-controlled expiry, bounded two-business browser lists, QA write/persistence/409/logout and export-rehearsal results are retained, not rerun. No fresh full-suite total is claimed. No new application defect was reproduced and no application code changed.

**Incomplete / not passed:**
- Genuine bidirectional issued-JWT foreign-record/business-ID API reads/writes and raw replay. Current browser supports normal UI but advertises no WebMCP tools or secure arbitrary authenticated-request replay facility. No token extraction, administrative impersonation or SQL identity simulation was substituted.
- AAL1 denial/AAL2 success for protected actions. Original AAL2 exists; QA private enrollment is still needed for the intended second-account acceptance.
- Live corrected QA revoke and post-revoke denial. Current exact proposal SHA256 remains `1bfb70bc564989f529d4c9bb0c448dcba7dd666c3c5e31d8c26675554ba427d3`; no execution approval supplied here. Preserve prerequisite sequencing and request separate final-exact-byte approval only when executable.
- True live expiry after the existing 14-day grants; clock-controlled evidence is retained. Grants were not shortened.
- QA owner DPA acceptance and authenticated new-origin legal/onboarding checks require normal private sign-in and owner action.
- Full actual-source backup/restore including real Auth service recovery, Storage bytes and essential configuration remains unverified. The documented synthetic restore and one-customer export rehearsal do not prove these. No source database credentials or complete backup route was established here; no password reset/new paid infrastructure was used.
- Whole-business export/deletion execution and final retention/data-return commitments remain outstanding. Original identity reuse resolves identity/public-address authorisation; it does not prove support-channel delivery, approve lifecycle promises or accept customer terms.

## Concrete new recovery-configuration blocker — proposal only

Fresh Auth configuration still has site_url=https://business-8yir63npg-buisness-ai1.vercel.app/ and ten existing allowed redirects, with no new-origin root/recovery entry. Refresh rotation=true, JWT expiry=3600 seconds and TOTP enroll/verify=true (log_3C-GcgRpTrV8).

Accompanying RECOVERY_REDEPLOY_20261029.PROPOSED.json changes only site_url to the new Preview root and appends that exact root plus /?auth=recovery, retaining every current redirect. Exact UTF-8 JSON SHA256 `c44f0f4870fb7a61075d7520cd71750e6f1bbe9f04ea41a6bcd5f8bbdad52dd3`. **Not applied; separate Development Auth approval required under the owner's current security-sensitive-change instruction.** No other Auth field is proposed.

No merge, Production/original Business AI configuration write, Auth/permission/membership/data write, real activation, invitation, provider communication, payment or additional spending. This configuration/rendering verification is not legal compliance certification.
