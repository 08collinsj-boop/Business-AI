# Colzo clean synthetic Chromium browser acceptance

The release candidate includes 12 existing Playwright scripts with intercepted API responses. They use **fake accounts, fake businesses and synthetic records only**. They do not certify real Supabase email delivery, production tenant permissions, billing or public launch readiness.

## Prerequisites (local temporary test checkout)

- Node 22 for parity with the GitHub verification workflow.
- A local non-Production source checkout of the exact proposed Colzo commit.
- Test-only Playwright and free Chromium installed in the scratch checkout:

```sh
npm install --no-save --ignore-scripts playwright@1.64.1
npx playwright install chromium
```

No real secret/API keys or browser session credentials are required. Avoid performing these steps in Production or using live accounts.

## Run

```sh
node scripts/colzo-browser-suite-clean.cjs --list
node scripts/colzo-browser-suite-clean.cjs
```

For a small, focused smoke:

```sh
node scripts/colzo-browser-suite-clean.cjs --only=colzo-auth-browser.cjs,colzo-mfa-browser.cjs
```

The runner uses an ephemeral loopback port for each script, checks one script at a time, limits each to 90 seconds by default and cleans up its temporary Python HTTP server process group. A failing or timed-out script makes the overall command exit nonzero, **not** a false PASS. Set `COLZO_BROWSER_TIMEOUT_MS` in the allowed range 10000–180000 if a slower local runner genuinely requires it.

## Acceptance evidence to retain

Record the Git SHA, Node version, Chromium/Playwright version, platform, test counts, actual device/viewport matrix and any failures. The printout contains one JSON result per script and a final count. A one-off successful synthetic browser test does not mean a customer can sign in with live credentials.

Before a public/customer launch, **separately verify** that the active preview targets `Business-AI-Dev` (`mvwseobgkexzpmmkgcxe`), an owner can confirm a real development email, mandatory MFA works, and core workflows persist synthetic test data through the authenticated APIs. Legal/trading identity, Stripe TEST, backup/restore, commercial hosting and release signoff remain independent gates.

Do not weaken MFA, tenant permissions or API mocks to force a green result. Do not merge or deploy to Production without explicit owner approval.
