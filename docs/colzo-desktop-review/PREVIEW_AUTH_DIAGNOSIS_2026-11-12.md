# PR #76 — authenticated visual QA access diagnosis

12 November 2026, UK. Visual acceptance remains incomplete. No authenticated native workspace screenshots are claimed.

## Current deployment and branch

- Repository: 08collinsj-boop/Business-AI; draft PR #76.
- Isolated branch: `feature/colzo-ai-desktop-command-centre-20261111`.
- Desktop visual refinements remain at `dd9de7ba609039577183ed6fea1978b792eb0aff`.
- The Preview configuration now returns HTTP 200, and the application presents a functioning sign-in form. This supersedes the earlier HTTP 503 blocker.
- PR is draft and unmerged. No Production deployment or configuration was changed in this investigation.

## Genuine browser and server evidence

The user supplied credentials through the secure browser-auth form. Supabase accepted the password sign-in. Colzo then stopped at `/api/legal` with HTTP 401.

Read-only Supabase log correlation shows:

| UTC time | Request | Result |
|---|---|---|
| 00:21:32 | Browser password sign-in | HTTP 200 |
| 00:21:33 | Preview server `/auth/v1/user` | HTTP 401 |
| 00:21:33 | Browser `/auth/v1/user` verification | HTTP 200 |
| 00:23:48 | Preview server `/auth/v1/user` | HTTP 401 |
| 00:23:48 | Browser `/auth/v1/user` verification | HTTP 200 |

For both rejected server requests, the Supabase gateway records **`UNAUTHORIZED_INVALID_API_KEY`**, message **“Invalid API key”**. The presented user-token role is `authenticated`; the failing API-key role is `service_role`.

This establishes a server credential configuration failure. It is not evidence of a wrong password, expired reset link, failed MFA or absent business membership. Those later checks have not been reached or accepted by this review.

No credentials, tokens, private user identifiers, IP addresses or key values are recorded here.

## Ruled-out hypothesis

The source contains a token-forwarding compatibility mechanism restricted to an older Preview branch. A narrowly scoped extension for this redesign branch was tested and committed as `d24524c9e8459bb245e0c6026f905cfd9e51d488`.

It did not resolve the live failure. Gateway evidence subsequently identified the invalid server API key, so the speculative compatibility extension and its two additional tests were removed by a forward commit. The authentication transport is restored to its original PR #76 behaviour. Existing Supabase verification, MFA, tenant permissions and release controls remain intact.

The diagnostic build passed 20/20 focused checks and 1728/1728 full automated tests. After removal, application code matches the previously verified visual-refinement version, which passed 1726/1726 tests. These are automated results; neither run constitutes authenticated browser acceptance.

## Concrete action requiring approval

The branch-specific Vercel environment-variable metadata is labelled “No service role”. No branch-specific `SUPABASE_SERVICE_ROLE_KEY` is present. Existing broader settings were not decrypted or modified.

The proposed action is to install the **existing** Development project's server credential as an encrypted/sensitive variable with exactly this scope:

| Setting | Proposed scope |
|---|---|
| Vercel project | `business-ai` (`prj_d5DuC65u4hSITFRC54ygswiMW9ST`) |
| Variable | `SUPABASE_SERVICE_ROLE_KEY` |
| Target | `preview` only |
| Git branch | `feature/colzo-ai-desktop-command-centre-20261111` only |
| Supabase project | `mvwseobgkexzpmmkgcxe` (Development) |
| Credential handling | Official connected services; no key in chat, source, browser or files |
| Deployment | Automatic Development Preview after the branch update |

This gives that Preview's backend privileged service-role access to Development data. It requires explicit approval because it expands the Preview's effective backend access. It does not require changing SQL, activating a pilot, enabling billing, modifying Production, rotating project keys or weakening user-token verification.

No such secret was installed in this investigation. After approval, verify server-side authentication first, complete legitimate MFA where required, then resume the five requested viewport captures and visual refinement of `#colzoOwner`.

## Outstanding deliverables

Authenticated captures at 1513×982, 1440×900, 1280×800, 1024×768 and 390×844; corresponding before/after comparisons; rendered interaction, focus, loading/error, long-text, overflow and mobile acceptance. The existing inspiration/Stitch references and prior source refinements remain available.
