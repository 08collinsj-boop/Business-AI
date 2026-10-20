# Colzo Business Knowledge - Development recovery (20 October 2026)

**Scope:** Existing Dev branch feature/colzo-complete-ui-motion-20261017, implementation review branch feature/colzo-native-knowledge-recovery-20261020. No Production/Pilot changes, real documents, live AI provider calls or billable resources authorised.

## Restored native experience

- A discoverable Business Knowledge shortcut in the native More screen; contextual links from Marketing and AI Receptionist.
- Knowledge overview displaying counts derived from the authenticated API (approved facts, review queue, sources), accessible status and filters for review/active/process.
- Manual entry for owners only, using the existing create_manual endpoint. Facts still begin needs_review.
- Owners/admins can prepare a signed private document upload for PDF/JPG/PNG/WebP/TXT/CSV, subject to the existing server-enforced limits, MIME validation and tenant role checks.
- **No automatic extraction** follows upload. A separate user action and explicit acknowledgement of possible AI-provider charges are needed. Extraction still uses the existing finalize API and is not called during QA.
- File replacement keeps the previously approved source in place until the replacement is approved by the existing backend.
- Source review supports editing type/title/content, include/exclude and explicit approval. The invalid confirmation and confirmation_version keys were removed from the native PATCH payload, matching the existing API validator exactly. Human confirmation remains in the UI, server validation/permissions unchanged.
- Member access remains read-only; authenticated GET response adds can_add_manual for precise owner-only UI gating while preserving can_manage for owner/admin.

## Data and safety

- Never expose the service-role key or private signed upload token outside the transient browser upload operation.
- Approved facts are still isolated by server-resolved business and only active facts are retrievable by assistant/Marketing.
- Untrusted documents do not acquire system-prompt authority.
- No automatic publishing, phone calling, AI generation or data migration was added.
- Provider extraction **may cost money**. It was never invoked against a real provider here. Confirm free allowance and provider policy before running a real Dev file test.
- No changes to owner authentication, MFA, customer portal, or signed-in session token handling.

## Verification and outstanding gates

- Focused backend Knowledge and Colzo regression suites, build and static checks passed.
- Synthetic browser on real Colzo HTML/CSS/JS in mobile Chromium: original authenticated UI mounted with mock data; navigated to Knowledge, edited/approved a fact, verified exact PATCH shape; signed upload invoked with mocked Supabase Storage; verified no implicit finalize, then exercised explicit finalize using a **mock API**; member read-only, sign-out, and 375/390/430/768 viewport no-horizontal-overflow checks passed; zero page errors.
- The large repository npm test was stopped by sandbox time limit at test 310, with no failures at that time. **Do not report a full-suite PASS based on this.**
- **Outstanding:** authenticated hosted Dev owner acceptance, Dev storage bucket/config verification, private upload on real Dev, allowed provider cost verification, failure/duplicate/replacement drills, real iOS Safari accessibility and keyboard/scroll testing, two-business live tenancy matrix and regression against concurrent Work changes.
- **Release:** NO-GO for Production; do not automatically enable providers or launch paid plans based on this isolated UI improvement.
