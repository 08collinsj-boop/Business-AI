# Colzo — demo-first launch runbook (10 November 2026)
**Audience:** Hartlepool/Teesside trades and service businesses with website enquiry / quote-request friction.
**Commercial goal:** first accepted fictional-data demo, then honest workflow feedback; 3 qualified future-pilot interests as an initial target, not a prediction.
**Scope freeze:** No new product feature or integration is a prerequisite for *showing an example-data demonstration*. Work on the already-agreed essential release blockers continues separately. No real customer-data access, self-service pilot activation, production or billing changes.

## A simple offer, without overpromising
“Colzo is being developed in Hartlepool to help small businesses keep website enquiries, quote requests and follow-ups organised. We’re offering a short example-data demonstration so local owners can tell us whether it would actually help. Pilot accounts are not available until final security checks finish.”

Do not pitch Colzo as a phone answering service, WhatsApp hub, automatic quote engine, confirmed-booking service, or fully available production product. £34.99/month is a *future proposed Starter price* for testing willingness to pay, not a live checkout offer.

## Three-minute demo script (illustrative — synthetic data only)
**All scenes are demonstration plans, not claims of captured, verified UI footage.** Verify each actual screen against the protected approved runtime before recording. If a capability fails, omit or explain it; don't simulate success as real functionality.

| Time | Screen / action | Voiceover / spoken message |
|---|---|---|
| 0:00–0:20 | Title card: “A quote enquiry arrives while you are on a job.” | “When you're working on-site, it's easy for website enquiries to pile up.” |
| 0:20–0:50 | Illustrative web enquiry from **Demo Customer A**, postcode **ZZ99 9ZZ** (deliberately invalid), job: “Replace outside light”; no real telephone or email. | “Colzo is designed to capture the essentials in one place: what needs doing and where the job is.” |
| 0:50–1:20 | Open the enquiry in owner workspace; review and identify the next action. | “Instead of trying to remember which message needs a response, the request and follow-up stay visible.” |
| 1:20–1:50 | Show owner-controlled booking *request* and decision. | “A request isn't an accepted appointment. The business owner still decides what to confirm.” |
| 1:50–2:15 | Demonstrate a routine answer based on approved facts, if validated on this exact runtime. | “Routine website questions can use business-approved information. Prices and promises still require the business to decide.” |
| 2:15–2:40 | Recap cards: Enquiry captured / Next action visible / Owner in control. | “The aim isn't more software to manage. It's a clearer way to keep on top of incoming work.” |
| 2:40–3:00 | CTA “Request a short demo / Register interest: getbusiness-ai.com/pilot/”. Label **Illustrative demonstration — fictional data**. | “We're inviting a few local businesses to give candid feedback on the example, before any future free pilot is activated.” |

**Recording checklist:** no account secrets, real contacts, notifications, private names or non-fictional customer details; no SSO login visible; 9:16 and 16:9 framing if captured for social; captions and a readable CTA; no false performance metrics; don't imply a private preview is a public account.

## Two useful discovery questions (asked only after interest)
1. “Where do enquiries actually arrive today, and which ones are hardest to follow up?”
2. “If the workflow saved you enough time reliably, could a future price around £34.99/month be worth considering? What would have to work?”

For each response, record actual source, date, business type, needs, demo permission, delivery status and whether they explicitly volunteered interest. No personal contact details in public repository comments. Do not record a vague “yes” as a pilot commitment or paying customer.

## Approvals and safe operating sequence
1. **Now:** Use the existing Colzo Page and public /pilot/ route to invite a conversation. Do not link a protected Development preview. Check the existing November 10 and 15 scheduled Facebook posts before any new post.
2. **Before public demo page rollout:** The PR #75 demo-first site Preview is verified HTTP 200 for `/`, `/pilot/` and `/demo/`, with `noindex` enabled. A missing output-allowlist route caused an initial 404 and was fixed with a regression test. Mobile visual/keyboard acceptance still needs review, and **Production remains unchanged** pending authorisation. The `/demo/` page is an illustrative fictional workflow, not actual authenticated product footage.
3. **Before email sending:** Two reviewed outreach emails (East View Roofing and S B Cleaning Services) appear in Gmail Sent on 10 November at approximately 11:40 UK. The other nine outreach drafts remain unsent; do not send or duplicate them without separate recipient-specific approval. Individually verify contact eligibility, any objection/decline, and obtain explicit approval of chosen recipients and wording. Avoid unsolicited marketing to sole traders without the lawful basis required under PECR. Don't duplicate previously sent follow-ups.
4. **After an accepted demo:** Send an example-data walkthrough link or run a supervised demonstration only if the footage is validated, accessible without private auth, and framed as fictional. Do not request uploads or real customer records.
5. **Pilot release gate:** Follow existing PRs #65/#67 and scheduled 12 November natural-expiry check; do not reactivate public signup or onboard business records without the necessary security/operational sign-off.

## Stop repeating these discussions
- No general feature comparisons until there is prospect feedback.
- No repeat of successful test suites without code changes or a concrete regression.
- No new release blocker from a nice-to-have feature.
- Progress is measured by **approved approaches → sent → genuine replies → accepted demos → feedback → explicit future-pilot interest → secure pilot activation → paid**.
- If blocked on deployment or sending approval, continue verifying example-data demo steps and refining the *existing* two priority drafts, not creating more unqualified prospects.

## Single next external action
Monitor genuine replies from the two reviewed messages already sent (East View Roofing and S B Cleaning Services), without auto-follow-up. Review one additional unsent draft for corporate eligibility and opt-out compliance before seeking separate send approval. Do not link the protected Vercel demonstration Preview to prospects; wait for approved public-site deployment.