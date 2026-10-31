# Live Knowledge approval contract correction — 29 October 2026

On protected Preview runtime 547c1903, the authenticated original fictional owner saved a manual FAQ fact: `QA Preview identity — fictional only`. Contents state that the workspace contains fictional data and offers no real services. No extraction provider, upload, outgoing message or paid action was used.

The normal review form displayed one awaiting-review item. Clicking Confirm reviewed facts and accepting the explicit accuracy confirmation produced the live error: `Confirm that you have reviewed the knowledge and that it is accurate and authorised for Colzo to use.` The fact remains inactive; no approval success claimed.

Cause: native approveKnowledge submits only action/source_id/items, whereas the deployed knowledge-verified wrapper requires confirmation=true and confirmation_version=knowledge_accuracy_v1 before delegating to the underlying handler. An older source-pattern test incorrectly asserted the omitted confirmation fields; that test checked the underlying handler instead of the deployed wrapper contract.

RED: new executable native-function regression failed on missing confirmation. Minimal frontend change adds both fields only after existing explicit owner confirmation. Server validation remains intact; no consent bypass or API weakening. Updated the stale pattern assertion and retained the review/role/field checks.

GREEN: focused native/deployed-wrapper verification suite, 10 tests passed. During harness development, corrected an invalid Node assertion method and isolated absent backend configuration; these test-harness failures are not product defects. Full verification result is recorded separately after completion. No deployment performed; live Knowledge approval remains FAIL until separately approved deployment and genuine retest.

Additional live read-only acceptance: Billing loaded Pilot access at no charge, no linked Stripe customer/subscription, and a read-only payment safety view. Marketing draft library opened; no generation, scheduling or publishing executed. Knowledge upload is explicitly unavailable in this pilot; manual review is the supported route tested above.

Booking fix commit 57a92839639a672d4cc95c9dcc537bd17cf33265 completed GitHub Pilot Verification successfully: https://github.com/08collinsj-boop/Business-AI/actions/runs/40963478863 . That run predates this Knowledge change and must not be attributed to it.

G1/G6 remain FAIL (live booking and Knowledge defects); G2/G3/G4/G5/G7 remain BLOCKED as documented. Real pilot NO-GO. No shared SQL, permissions, grants, original legal values, Production, SSO/MFA settings, real invitations, payment or spend changed.
