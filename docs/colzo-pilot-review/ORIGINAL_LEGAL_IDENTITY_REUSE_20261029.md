# Original Business AI legal identity reused for Colzo Preview — 29 October 2026

**Configuration copied and independently verified. Not deployed. Real-business pilot remains NO-GO pending outstanding acceptance and activation gates.**

## Authority and source

Owner instructed: **use the original data from business ai legal** after being asked for Colzo operator/contact details. This authorises reuse of that existing public legal identity; no new operator/address/telephone was invented.

The original Business AI project business-ai-pilot (prj_GRPhAzaJnjlNv5KcQ16LhwdOX0kF) contains seven explicit Production legal settings. Each was read individually via the existing authorised hosting connection, not copied from another business, Auth identity or a secret provider key. The original public address consent flag is true, operator type is sole_trader, and contact email/telephone match the previously published records. Public website lookup could not retrieve the legal endpoints; original hosting configuration, prior published-contact evidence and the stored public consent setting are the sources used. No claim of a fresh public endpoint or inbox-delivery check is made.

## Applied exact scope

Destination: business-ai project prj_d5DuC65u4hSITFRC54ygswiMW9ST, **Preview only**, branch **fix/colzo-pilot-release-gates-20261026**.

Created seven new encrypted branch-specific settings with upsert=false after verifying that none existed in that branch scope:
- LEGAL_OPERATOR_NAME
- LEGAL_TRADING_NAME
- LEGAL_OPERATOR_TYPE
- LEGAL_OPERATOR_ADDRESS
- LEGAL_OPERATOR_ADDRESS_PUBLIC_CONFIRMED
- LEGAL_CONTACT_EMAIL
- LEGAL_CONTACT_PHONE

Copied all original values exactly except **LEGAL_TRADING_NAME=Colzo**. No company/VAT number was invented or copied. Actual address/telephone/identity values are kept in configuration and are not duplicated in this PR.

Canonical target seven-field JSON SHA256: **4f9526546640b4edcbbedc782150e3f9b80c49283edcd85793144029b8fcf01e**.

## Executed validation and preservation

- Exact source reads and actual unmodified legal-public handler validation: log_KOpRNxDG4QvM. Tested successful GET identity_configured=true with Colzo and the exact original operator/address/contacts, blank company/VAT fields and no-store header. Turning the address-public flag false in the isolated test hid the address and returned identity_configured=false. POST returned 405. No network/customer processing was part of this isolated handler test.
- Branch-only creation: log_BdlUXcacpnor, seven created entries.
- Independent individual readback of all seven destination values exactly matched the tested map; all **87 pre-existing destination environment entries** retained their exact key/value/type/target/branch/custom-environment representation. All seven original Business AI legal values independently read back unchanged.
- SSO and both existing Preview and Production deployment IDs independently matched the before snapshot: log_U1osY2_zpVbA.
- Handler blob 808e82b234740326f61f9338b687dc8221c85a39 was checked against the exact approved runtime adecce31b88f5c1ffd623480524996cb5ae91581. No application code changed; no broad suites repeated.

## Deployment boundary

Environment settings take effect only in a subsequent deployment. The currently running protected Preview still uses its old environment; **live identity_configured=true is not yet accepted**.

Concrete next release action, requiring the existing separate deployment approval: redeploy exact runtime **adecce31b88f5c1ffd623480524996cb5ae91581** to protected Development Preview for this branch, using the seven copied legal settings and preserving SSO, existing Development Auth/database settings, disabled paid providers, empty crons, Production aliases and active grants. Do not merge or activate a real pilot. After approval and fresh release preflight, verify READY, the live public legal values/Colzo trading identity and all legal-page rendering. Do not auto-accept DPA/terms.

Owner reuse instruction resolves the need to retype the original identity/contact/address, but does not demonstrate email/telephone delivery, legal review, final lifecycle terms or customer acceptance. API foreign-ID/replay/protected-action, live revoke/expiry and other documented pilot gates remain open. No real business is activated or invited.

No Production/Pilot/source settings changed, no credential/provider key copied, no Supabase data/Auth/permission write, no deployment/merge, legal acceptance, outbound contact or charge.
