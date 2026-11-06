# QA first-time MFA / DPA setup loop — 6 November 2026

## Observed

Independent QA password authentication succeeded on source 8dc9a863. Read-only metadata confirmed one issued QA session and zero verified factors. At the rendered DPA v1.1 gate, acceptance was already checked, and the page reported `Set up two-step verification in Account security first` / `Complete two-step verification in Account security, then try this action again.` The user then explicitly instructed acceptance. No acceptance success is claimed: the mandatory server MFA check correctly prevented it.

The UI previously redirected first-time MFA users into Settings, but the workspace/Settings shell is hidden before DPA acceptance. This creates a setup loop. The fix preserves server enforcement and uses existing Supabase SDK enrollment controls before protected workspace actions.

## Change

An account-only setup dialog is available from protected actions at existing signed-in legal/onboarding gates. It moves the existing MFA account card and its listeners into a modal; it never mounts incident controls, business activity, customer data or a workspace shell. Session presence is checked before opening. The pending action waits until the user explicitly continues and SDK assurance confirms AAL2. Cancel, unavailable assurance and sign-out fail closed. Sign-out removes the dialog and credential fields. Background app content is inert; the modal supports keyboard focus containment, Escape and safe-area-aware scrolling.

The existing verified-factor challenge remains available at pre-workspace gates. No MFA factor is removed to bypass enforcement. No new agreement is accepted in tests, and no private credentials/secrets are captured. Actual authenticator enrollment remains a private user action.

## Verification and release boundary

Two regression tests first failed on the old implementation. Three behavioral regressions now pass for reachable account-only setup, AAL2-only continuation/cancel, and sign-out cleanup, with zero tenant API requests. Existing navigation/security transport/UI focused checks passed. Full verification and exact-source CI results are recorded in PR comments after completion.

Source correction requires a separately approved protected Development Preview deployment. Current runtime remains unchanged. After deployment, verify genuine enrollment, AAL2 and authorised DPA acceptance using actual QA sessions; do not infer live acceptance from tests. Retain the earlier Preview as containment; no SQL, grants, Auth routing, Production settings, public signup or strict-replay activation changes are part of this fix. Pilot remains NO-GO.

## Live deployment correction

Owner-authorised candidate a775d339 deployed READY as dpl_7jDhAHTNYtAGzmyKJbjsknWu3v1L at https://business-9no614jrb-buisness-ai1.vercel.app/ . Real QA password authentication reached the DPA gate, and authorised acceptance triggered the expected MFA requirement. Live UI then exposed a defect: colzoApp is the body itself, so setting its inert property also disables its appended modal. No DPA acceptance/MFA success is claimed.

Regression fixture now matches the actual body ID and first failed with body inert=true. Correction makes only the modal’s sibling background elements inert, preserving each prior state for restoration. Body and modal remain interactive. Focused navigation/setup tests pass; full verification and CI are recorded in PR comments. A new exact-source deployment approval is required for this correction. The a775 candidate must not be treated as accepted.
