# Colzo owner preview — reproducible browser acceptance

This optional test runs headless Chromium against a **locally served copy** of Colzo. It does not contact the original Business AI API or use a customer password. A simulated Supabase sign-in and fake enquiry/booking/action responses are intercepted in the browser. It tests the actual HTML/CSS/JavaScript app, not just source strings.

## Local setup

From the repository root, with Node.js, Python 3 and a network connection for the initial browser installation:

```sh
npm install --no-save playwright@1.56.1
npx playwright install chromium
npm run verify:colzo-browser
```

A test-only `NODE_PATH` may be used when Playwright is installed outside the repository, so production dependencies remain unchanged. Browser installation is **not** part of the normal app build or `npm run verify`.

## Automated checks

- 375×812, 390×844, 430×932 (iPhone), 1366×768 and 1440×900 (desktop)
- Successful mock owner sign-in; three mock enquiries; filtered enquiry cards, real-work booking and action views; last Settings item reachable
- Responsive shell geometry: separate scrollable body, no navigation overlap, no horizontal overflow, no dock below viewport
- Settings Security and Appearance controls, local quote generation, refresh, exit and cleared content
- No unhandled page JavaScript errors or unexpected external network destinations
- Local PNG screenshots written to `/tmp/colzo-browserqa` by default (override with `COLZO_QA_SCREENSHOTS`); these use *fake fixtures only*
- The locally served page must not send data to original live APIs; test routes intercept the only authentication/compatibility endpoints

These tests are **not** evidence that live preview authentication, project migrations, customer billing or external provider integrations work. The actual Vercel preview remains protected and a fully authenticated production-equivalent session still requires separate certification.

## Results, 13 October 2026

All five viewport scenarios PASS after introducing the non-overlapping flex dock. Enquiry count, booking/action cards, Settings, quote drafting, safe refresh and exit were exercised. All screenshot comparisons beyond viewport geometry remain editorial, not pixel-perfect visual certification.

### Session-exit race check

The 390×844 scenario deliberately delays a mock GET request until after the owner presses Exit. The previously loaded data and dashboard remain hidden when the delayed response arrives. This verifies a privacy-sensitive UI lifecycle case without involving any real customer data.

### Duplicate-name integrity test

The 390×844 fixture deliberately assigns the same display name to two different enquiries. The owner contacts screen must still render all three enquiry contact entries, because a matching name is not reliable proof that two people are the same customer. No real customer information is used in this test.
