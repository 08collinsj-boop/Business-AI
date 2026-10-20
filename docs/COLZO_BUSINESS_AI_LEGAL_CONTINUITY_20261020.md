# Colzo - reuse of previous Business AI legal framework (Development, 20 October 2026)

## User instruction and legal structure

The owner instructed that the previous Business AI legal framework be reused and adapted to **Colzo**, operating as the same individual sole trader under a new trading name, **not** a newly incorporated limited company.

This is a continuity and branding update, **not** an independent legal review or acceptance of any DPA, Terms or Privacy changes.

## Source and reuse

The repository already contains Colzo-branded versions of the original Business AI legal pack:

- Terms of Service 1.2, Privacy 1.1, Acceptable Use 1.1, DPA 1.1, Storage & Cookie Notice 1.1, and Sub-processors 1.3.
- Contracting structure remains the **individual sole trader trading as Colzo**.
- The existing owner-only, server-recorded DPA acceptance requirement remains in place.
- No claim of being a limited company, VAT registered, ICO registered or HMRC-registered is made without verification.
- No past owner/member acceptance is copied, forged or marked as current.

The existing docs/COLZO_SOLE_TRADER_LEGAL_REVIEW_PACK.md remains the more detailed provider identity and launch checklist.

## Corrected inconsistency

The data-deletion instructions still hard-coded a personal operator identity and the old Business AI support inbox, while the other seven legal pages used /api/legal-public and a shared dynamic identity notice. This could show inconsistent operator contacts and expose a personal name before the required contact/address configuration was approved.

- The data-deletion page now uses the common service-provider identity notice, stating continuity from Business AI to Colzo rather than repeating a hard-coded personal name.
- Until an approved complete Colzo operator configuration is present, its existing, previously published Business AI support rights-request contact remains visible as a **legacy fallback**. **Inbox delivery has not been verified in this task.**
- Once /api/legal-public returns identity_configured=true, the legal operator script replaces the rights-request email with the approved configured email using safe DOM text assignment and a mailto link, after an email format check.
- Legacy Facebook/Meta app naming is identified as the **legacy Business-AI Pages** integration. Do not misstate the registered Meta app name.
- Existing legal terms, DPA versions and historic acceptance records remain untouched. No paid service is enabled.

## Verification

- Static regression tests cover sole-trader continuity, version parity, rights request links, unapproved identity exclusion and contact switching.
- Chromium tests on actual legal HTML/script: configured and unconfigured synthetic identities, zero JS exceptions, no mobile overflow at 390px, correct fallback and upgrade.
- Full repository tests and build must pass before Development merge.

## Remaining actions to unblock customer assistant

The backend requires current DPA 1.1 acceptance and a real legal provider identity (verified name, trading name, sole-trader structure, service address, contact email and telephone; explicit consent for address disclosure). The Development Colzo business currently has no DPA 1.1 acceptance on record.

The user has said sole trader and below the HMRC £1,000 gross trading allowance threshold. This does **not** prove VAT or ICO exemption or remove business-contact obligations.

1. Confirm whether a previous Business AI **service/correspondence address** remains valid and is explicitly approved for public disclosure. Do not infer approval to disclose a home address.
2. Verify the intended Colzo support email, the legacy rights-request inbox, and telephone number. Do not publish unverified details.
3. Configure only confirmed values in the correct Development Preview: operator_type sole_trader, trading name Colzo, and no company/VAT registration numbers unless genuinely applicable. Public service address confirmation must be explicit.
4. Recheck public legal readiness. The actual authorised business owner must independently review/accept DPA 1.1 through the product flow. No automated acceptance.
5. Recheck business-specific public assistant availability and AI entitlement. Legal acceptance alone does not guarantee a provider connection, feature entitlement or no AI costs.
6. Complete legal/ICO review, hosting, recovery, real auth/tenant and mobile acceptance before public launch.

**Status:** Public beta NO-GO. No Production settings, real data, owner consent, payments, provider services or billing were changed.
