# Automated Marketing factual grounding

The 9 October Pilot acceptance run saved a draft containing unsupported
customer-loss, lead-collection and time-saving claims. Existing regex guards
did not cover those assertions, and included the generated automation brief
in their evidence text.

Automated generation now has a separate deterministic evidence check before
the completed draft is stored. Each statement must match a complete saved
factual statement (case, whitespace and final punctuation may vary), or one
of three neutral contact CTAs. Knowledge titles, keywords, business type,
the automation brief, previous posts and photo descriptions are excluded as
evidence. Hashtags are restricted to exact saved identity/location/service
names. An actual factual statement must appear in the main caption.

A rejection returns `MARKETING_GROUNDING_REJECTED`, marks the reserved
generation failed, records a best-effort audit event with categories and
the generation ID, and sets the run failure code. It does not store completed
copy, retry the rejected generation, approve a draft or create a delivery.
Existing disabled-state and publishing safeguards are unchanged.

This is deliberately conservative: automated factual paraphrases are rejected
even if a person might consider them accurate. With sparse facts, repeated
factual wording is allowed; novelty is less important than factual support.
Manual owner-request generation retains its existing behaviour. Saved profile
fields remain trusted under the existing Marketing policy; only Active
Business Knowledge contents are included from the Knowledge workflow.

Regression coverage includes the exact failed caption, unsupported claims in
every public text field, hashtags, negative facts, metadata and style/photo/brief
contamination, sparse evidence, and mocked end-to-end success/failure persistence
and audit behaviour. All provider and database calls in these regressions are
mocked and unexpected destinations fail. No additional live draft is required.

These repository changes do not deploy code, change automation settings,
modify billing, run database migrations or access Production.

Local verification: `npm run verify` passed all 552 tests and verified 171
JavaScript files, HTML script syntax, secret patterns and temporary markers.
`git diff --check` also passed. The new suite contains ten regression tests.
