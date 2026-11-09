# Privacy and pilot documentation: proposed corrections

Review draft, not legal certification or published terms. No account verification link, subscription or legal agreement was submitted.

## Observed state

The connected iubenda account for `support@getbusiness-ai.com` returns `verified=false`; the site list returns an empty array. This confirms the account is unverified in that service response. It does not mean Colzo has no separately hosted legal pages.

The public Privacy Notice renders at `https://getbusiness-ai.com/legal/privacy.html`. It still displays the notice that the operator's legal/trading name, geographic establishment address and direct contact information are not configured for public display. Do not infer a company identity, company number, postal address or trading structure from the Colzo brand or a fictional test tenant.

The repository contains Privacy, Terms, DPA, Sub-processor, Acceptable-use and Storage/Cookie pages. The identity loader depends on `/api/legal-public`; the independent static website has no verified working identity response. Publishing the HTML alone does not complete that configuration.

Privacy text describes configurable 365-day lead and 730-day audit **review periods**, not deletion deadlines. Those defaults do not define what happens to real pilot data after 14-day access expiry. The DPA describes return/deletion at the controller's choice, but execution and backup retention still require an agreed process and testing.

## Proposed changes for review

1. James confirms the real operator name, trading name, legal structure and suitable business contact/address for publication. Confirm publication consent before configuring a residential address. No identity details are invented in this draft.
2. Render approved identity consistently on both website and app, including static-site output where the API is absent. Add release checks for a populated identity and a functioning support route. Keep release blocked until confirmed; do not silently remove the warning.
3. Add pilot participation terms stating approval-only admission, exactly 336 hours from activation, two named seats, no card, no automatic charges/conversion, current feature limitations and an agreed support window.
4. State a precise, approved retention/return/deletion schedule for enquiry data, account data, audit evidence and backup copies. Distinguish access expiry from deletion. Test export/deletion/recovery operations in isolation before promising them to businesses.
5. Reconcile the disclosed AI providers and downstream routing with the actual enabled pilot configuration. Document data sent, provider roles, retention/training terms and transfer safeguards. Do not advertise a provider control or guarantee that has not been verified.
6. Confirm the actual browser-storage/cookie inventory for the final deployed release, including marketing embeds, authentication and third-party scripts. Only then align notices and consent implementation as applicable.
7. James completes iubenda email verification from the account's current official flow. Do not purchase a package. Recheck `verified` and associated sites afterwards. Verification is a service-account step, not a substitute for reviewing Colzo's terms and processing.

Professional review should cover the operator/controller/processor roles, pilot terms, lawful bases, international transfers, retention/deletion, incident handling and applicable registration obligations. No assertion of legal compliance is made here.

