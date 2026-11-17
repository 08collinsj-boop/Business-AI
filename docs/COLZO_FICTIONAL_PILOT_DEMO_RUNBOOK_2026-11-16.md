# COLZO — five-minute fictional-data product demonstration
**Internal rehearsal, 16 November 2026. Not a live customer, approved pilot, provider integration or Production recording.**
**Target audience:** an owner/operations manager who spends time moving between enquiries, customer records, appointments and tasks.
**Promise to test:** fewer handoffs and quicker situational awareness, not “fully integrated AI automation”. All example names and records below are fictional.

## Recording environment and safety
- **Only:** the isolated QA branch's locally served Chromium app with fixtures/intercepted APIs, as exercised by `pilot-verify.yml`. CI scripts `scripts/colzo-native-browser.cjs`, `scripts/colzo-workflows-browser.cjs` and `scripts/colzo-motion-browser.cjs` already generate screenshots in temporary, short-lived Actions artifacts.
- **Never:** the protected Preview, real pilot records, real connected accounts, real OAuth credentials, billing, actual business email, staff identities or existing user sessions.
- Film/capture at **1440×900** for main desktop explanation and **390×844** for business-on-the-go. Browser captures are Chromium viewport emulations, **not** iPhone Safari proof. Label visuals “Development illustration — fictional data” on every distributed demo.
- Approved presentation palette: graphite #0B0E14 / #151A22; accent electric-lime. Do not replace the product with a fabricated mock that implies live integration works.
- Keep the demo free of the operator's personal name, private address, passwords and customer data.

## Five-minute storyboard and voiceover (spoken wording can be edited)
| Time | Screen/scene | Fictional fixture or capability actually shown | What to say | Avoid |
| --- | --- | --- | --- | --- |
| 0:00–0:35 | Desktop Home overview | 4 data-derived KPI tiles, briefing, quick routes | “This is Colzo's workspace. Instead of starting by opening several tabs, I can see what needs attention in one place.” | Real-time multi-app AI claims |
| 0:35–1:15 | Enquiries | Search/filter a fictional enquiry, open its details | “An enquiry can move from a new request to a tracked conversation. I can find the relevant record without searching through messages.” | Claiming a real enquiry was captured |
| 1:15–2:00 | Bookings | Existing fictional booking; edit/create, demonstrate invalid end time being rejected | “Appointments are part of the same workflow; we can catch an invalid booking before saving it.” | Claiming external-calendar sync or true live conflicts from this mock |
| 2:00–2:35 | Customers and Projects | Browse fictional Customers and Projects; open an existing project | “Customer and project context sits alongside the enquiries instead of becoming another disconnected spreadsheet.” | Claiming LeadConnector synchronisation |
| 2:35–3:20 | Actions and desktop search | Show task statuses and keyboard launcher (Ctrl+K); open relevant screen | “I can jump directly to the work that matters, update it and return to the overview.” | Claiming autonomous AI writes |
| 3:20–4:10 | Work Hub concept | Show available vs disabled ClickUp integration states; no provider records | “This is where connected applications will appear. ClickUp and LeadConnector are the first integrations we want to prove with a customer using permissioned access.” | Showing a fake provider task as connected or an activated live integration |
| 4:10–4:40 | Mobile 390×844 | Home/Enquiries, touch nav and reachable bottom content | “On a phone I can check what's happening while I'm away from my desk.” | Saying genuine iPhone Safari is verified |
| 4:40–5:00 | Close | One problem/desired outcome | “Which task costs your team the most time today? We'd start by proving whether Colzo actually reduces that.” | Guaranteeing ROI or promising features not tested |

## Fictional records and screenshots
Use the actual scripts' fixtures rather than pretending a real business exists: `QA Electrical Services`, `Mock Jones`, `Sample confirmed visit`, `Customer survey`, `Fixture Works`, `Inspection project`. These records differ across scripts: **never edit together into a supposedly continuous live account**. If a continuous demo is required, reuse one script's fixture set across scenes; never splice different fake accounts without the “illustrative composite” label.

After manually dispatching `pilot-verify.yml` on the isolated QA branch, use the Actions run's **fictional-only screenshots artifact**. Existing scripts save, among others, `native-desktop-home-1440.png`, `native-home-390.png`, `native-enquiries-390.png`, `projects-1440.png`, `bookings-390.png`, `tool-finder-1440.png`. Confirm exact artifact inventory for the run before editing a video; screenshot filenames are not guaranteed to be persistent links. Capture only after full suite passes.

## What qualifies the demonstration
- Two audiences: trades/service business first; complex multi-software organisation only after permissions and scope approval.
- Two buyer questions: “What admin step takes the longest?” and “What data or action must remain in your current system?”
- Success metric: buyer identifies one measurable workflow and agrees to an authorised **fictional-data** follow-up. A share, like or page view is not a customer commitment.
- Explicit status card or spoken sentence at end: **“Colzo is in Development. Connected-provider workflows and external customer data are not active in this demo.”**

## Rehearsal quality checklist
- Source SHA, Chromium version, run link, screens, labels and demo disclaimer recorded
- No network requests to unapproved domains, no secrets or user identifiers in console/screenshot
- Keyboard focus visible; at 1440×900 sidebar Settings button does not overlap account footer
- Consistent safe areas and text visibility in 390×844 screenshots
- No invented integration/AI capability, no live launch language or personal name
