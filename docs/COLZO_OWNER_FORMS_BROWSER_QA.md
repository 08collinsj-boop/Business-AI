# Colzo full owner-side forms — safe browser acceptance

The standard Colzo preview has a separate authentication environment; the existing owner account works through the separate read-only compatibility page. This script tests the **actual full-owner JavaScript event handlers and API request shapes** for Projects, Clients and Quotes, without connecting to the existing Business AI account, database or network.

## Optional local test

Requires Node.js 20+, Python 3, Playwright and Chromium for testing only. The browser dependency is **not** installed in the production app bundle.

```sh
npm install --no-save --no-package-lock playwright@1.56.1
npx playwright install chromium
npm run verify:colzo-owner
```

To keep production modules untouched, use a separate temporary directory for the optional Playwright package and set `NODE_PATH` to its `node_modules` before running `npm run verify:colzo-owner`.

## What it exercises

At **375×812, 390×844, 430×932, 1366×768 and 1440×900**, Chromium loads the unchanged `assets/colzo-workspace.js` owner event handlers into a minimal DOM fixture with local fake API responses, rather than the full live application. The tests exercise:

- Create a project linked to an existing fake enquiry, confirm it appears, edit progress, and submit the exact previous version.
- Create a client, demonstrate a simulated edit conflict leaves the form open with its unsaved values, then save successfully.
- Open an enquiry, create a quote that starts as a draft, manually confirm it was sent, then mark it accepted.
- Verify every PATCH passes `expected_updated_at`; no final/sent quote is directly created and no request to any external service is made.
- Deliberately break both Projects and Clients GET requests after records are already loaded. The UI must clear previous rows, show explicit unavailable errors (including the project metric), and recover when fake service availability is restored.
- Capture JavaScript errors from the browser, and ensure every viewport completes without an error.

All mock records and authentication stand-ins live in the test file. No real passwords or customer data are used, no emails are sent, and the script makes no production API calls.

**Limitations:** The DOM is a minimal fixture, not the complete production markup. A successful test proves the owner-side form event flows and request payloads, **not** that the Vercel preview authentication, live backend writes or visual screens are ready for deployment. Those still require staged Auth with test tenants, a verified restorable backup, and explicit release approval.
