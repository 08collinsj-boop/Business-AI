# Colzo - customer-facing UI hardening, independent draft

17 October 2026. Development only. No Production release or owner approval of unapproved Stitch designs.

## Scope

Base: PR #19 snapshot bcc454f5f797709658a757236d39afc785229a8e.
Preserve the five locked designs (Home, Enquiries, Bookings Calendar, Booking Details, Customers directory) and three previously approved Customer Profile, Add Customer and Edit Customer designs.

## Verified fixes in this draft

1. **Unsaved Changes, flagged design #089:** Draft changes in customer, enquiry, booking/action and business settings forms are now guarded before navigation or cancellation. A bottom-anchored graphite/volt modal offers Keep editing and Discard changes. Keeping retains typed inputs; only explicit discard navigates away. The sheet has labelled dialog semantics, keyboard Escape and Tab focus handling, large buttons and iPhone bottom safe-area styling.
2. **Settings subpage navigation:** When a user changes settings section while already on Settings, the target section now renders instead of only resetting scroll; an edited business form is not discarded silently.
3. **Enquiries zero-state:** A truly empty directory offers Create enquiry, while an unmatched search/filter uses a distinct no-results message and reset action.
4. **Session expiry:** Any temporary unsaved overlay is cleared on logout/auth loss. Multiline form fields have a visible keyboard focus ring.

None of these changes saves records on discard, changes API permissions, modifies provider settings or bypasses real save validation.

## Testing evidence

- Static Node regressions on UI routing and CSS: 9/9 passed.
- Synthetic jsdom interaction checks directly evaluating the modified Colzo UI JavaScript: four scenarios passed (enquiry, business settings, customer form, booking modal; keep/discard).
- Complete npm run verify: 697/697 passed, 209 JavaScript files verified, zero skips or failures.
- git diff --check: passed.

Limits: Full Chromium screenshot/interaction testing was not available in this remote session (Playwright and Chromium executable unavailable). The local browser also refused file/localhost navigation. Therefore, no real iPhone screenshot or 390 x 884 visual acceptance is claimed. Authenticated Dev remains Work's responsibility.

## All twelve originally flagged Stitch screens

- 026 More Menu - corrected candidate ready for owner review; actual scroll/nav safe-area acceptance pending.
- 075 Conversation Details - corrected candidate ready; no fabricated AI transcripts.
- 084 Search Results - corrected candidate ready; real search/filter state acceptance pending.
- 085 Offline and Retry - corrected candidate ready; offline connection behaviour pending.
- 087 Access Unavailable - corrected candidate ready; real auth and recovery acceptance pending.
- 088 Loading State - corrected candidate ready; skeleton and nav visual validation pending.
- 089 Unsaved Changes - corrected HTML v7 awaiting browser visual review; functional safeguard implemented here.
- 090 Delete Confirmation - corrected candidate ready; destructive action controls require separate proof.
- 092 Business Directory - corrected HTML v7 awaiting browser visual review; live matching remains unsupported.
- 094 Notification Preferences - corrected HTML v7 awaiting browser visual review; browser permission does not mean push delivery.
- 098 Enquiry Notes - corrected candidate ready; stored note and lifecycle acceptance pending.
- 103 Enquiry Status Picker - corrected HTML v7 awaiting browser visual review; actual sheet/tenant status flow still pending.

Eight candidate designs are ready for review. The remaining four v7 HTML corrections are unverified in an actual browser. None has final owner approval. The 107 earlier accepted visuals remain references only, not proof of working functionality.

## Next Work acceptance

Work should verify the latest Dev preview SHA/project identity, sign in with the existing 08collinsj account and Authenticator, and inspect all twelve at matching 390 x 884 before/after viewports. Exercise the new Unsaved Changes sheet on live Dev screens without editing unrelated customer data. Complete remaining focus, accessibility, safe area, offline/retry and destructive-action checks, then supply screenshots and reproducible results. Do not merge this draft or deploy to Production without user approval.

PUBLIC LAUNCH: NO-GO.
