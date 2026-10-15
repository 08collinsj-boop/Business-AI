> **Historical note (15 October 2026):** This earlier shared-Pilot-backend preview design is superseded on the corrective development branch. The safe Colzo preview must use same-deployment API handlers and the development Supabase environment. Do not rely on the old cross-deployment rewrite for authentication or record writes. Production and the original Business AI Pilot remain unchanged.

# Colzo frontend migration - existing Business AI backend

Isolated development-branch change. Original Business AI Pilot remains running
and its account records, business membership, billing, marketing and database
configuration stay unchanged.

Colzo sends API calls from its preview through a Vercel external rewrite:
source /api/:path* -> https://business-ai-pilot.vercel.app/api/:path*.
The original Pilot backend runs the request with the EXISTING server credentials.
It also supplies the browser-safe public config used for Colzo's existing
Supabase login. No private secret is copied to the Colzo deployment.

IMPORTANT: authenticated changes in Colzo act on real Business AI business
records. Use read-only verification until authorised test fixtures are ready.
Preview SSO must remain enabled. Do not promote to Production or alter domains.

Rollback: use the unchanged prior Colzo UI commit 97494da6209efe8430fafd9698f490592f6b10f4
on feature/colzo-stitch-20261013. The original Pilot remains the rollback
destination. No production migrations are part of this change.

Verification gates: all node tests; verify deployed GET /api/public-config and
/api/health through Vercel; owner authentication through existing Supabase;
existing owner tenancy, legal/MFA, bookings, enquiries, marketing, security
and billing. No live writes or release to all users without approval.

Future consolidation: serve the Colzo frontend directly from the established
backend's hosting project after acceptance, removing the temporary proxy.
