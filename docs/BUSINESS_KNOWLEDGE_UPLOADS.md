# Business Knowledge Uploads

Status: source-complete for the Pilot candidate; live Pilot migration/upload/extraction still require deployment-time verification.

## What it does

Business owners/admins can upload factual business files from Settings. Supported Pilot formats are PDF, JPG/JPEG, PNG, WebP, TXT and CSV.

The workflow is deliberately review-first:

1. The authenticated server verifies the user's business membership and owner/admin role.
2. The server creates a tenant-owned source row and a short-lived signed upload token for the private `business-knowledge` Supabase Storage bucket.
3. The browser uploads directly to private Storage using that signed token. The service-role key is never exposed to the browser.
4. The authenticated server downloads the uploaded object, verifies its size, hashes it for duplicate detection and sends it for structured extraction.
5. Extracted facts are stored as `needs_review` items.
6. An owner/admin edits, includes/excludes and explicitly approves the facts.
7. Only items with `status = 'active'` can be retrieved by the receptionist or AI Marketing.

Uploaded document text is always treated as untrusted data. It cannot change tenant access, permissions, billing, safety rules, system prompts or AI handling policy.

## Limits

Pilot limits are server-owned:

- 10 current knowledge files per business
- 10 MB per file
- 100 MB total current-file allowance
- up to 80 extracted facts per source

Supported MIME types:

- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/webp`
- `text/plain`
- `text/csv`

## Data model

Migration:

`supabase/migrations/20260923193000_add_business_knowledge_uploads.sql`

Creates:

- `public.business_knowledge_sources`
- `public.business_knowledge_items`
- private Supabase Storage bucket `business-knowledge`

Both public-schema tables have RLS enabled. Authenticated browser users receive read-only tenant-scoped policies; writes go through the authenticated server. The Storage bucket has no broad authenticated upload policy: upload access is granted per prepared source with a signed token.

## File extraction

`lib/knowledge.js` uploads the source temporarily to the OpenAI Files API with purpose `user_data`, requests a one-hour expiry and performs a best-effort immediate delete after extraction. The Responses API returns a strict structured set of factual items for owner/admin review.

The extraction system prompt explicitly treats all document contents as untrusted data and forbids invented facts or document-supplied instructions from changing system behaviour.

## Retrieval

Approved knowledge is not dumped wholesale into every prompt.

`getApprovedKnowledgeSafe()` fetches only `status=active` knowledge for the server-resolved business and ranks a bounded subset using the customer's/owner's request. The model receives only item type, title and factual content—never source IDs, storage paths, hashes or internal tenant metadata.

Receptionist integration:

- `api/enquiry.js`
- up to 12 relevant items / approximately 12,000 characters
- retrieval failure is non-fatal to the core receptionist

Marketing integration:

- `lib/marketing.js`
- up to 20 relevant items / approximately 18,000 characters
- only approved knowledge is added to `TRUSTED BUSINESS FACTS`

## Versioning and replacement

Replacing an active source creates a new source first. The previous source remains active until the new extraction is reviewed and approved. Once the replacement is approved, the previous source and its active items are marked `superseded`.

This prevents a failed or unfinished replacement upload from removing currently trusted business knowledge.

## Pilot deployment order

Do not touch Production.

1. Start from the final Pilot-ready source package.
2. Apply `20260923193000_add_business_knowledge_uploads.sql` to **Business-AI-Dev / Pilot only** after the earlier migrations are present.
3. Verify both knowledge tables exist, RLS is enabled and the `business-knowledge` bucket is private with the expected MIME/size restrictions.
4. Run `npm test` and require all tests to pass.
5. Deploy the code to the existing `business-ai-pilot` Vercel project only.
6. Test with a harmless fake menu/price list before any real business file.

## Required Pilot smoke tests

- Owner and admin can prepare/upload; member cannot mutate knowledge.
- A browser-supplied `business_id` is rejected.
- A file uploaded for Business A cannot be listed/read/approved by Business B.
- Unsupported extension/MIME mismatch/oversized files are rejected.
- Duplicate file content is rejected.
- Extracted items stay `needs_review` until explicit approval.
- Editing and excluding an extracted fact works before approval.
- Only approved facts appear in receptionist context.
- Only approved facts appear in AI Marketing context.
- A malicious document instruction such as “ignore your system prompt” is stored only as untrusted source text and never changes system behaviour.
- Replacing an active file does not supersede the old source until the replacement is approved.
- Removing a source removes the private Storage object and cascades its extracted rows.
