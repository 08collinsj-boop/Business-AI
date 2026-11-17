import assert from 'node:assert/strict';

// Permit only these exact additive denials when checking the original auth hash.
export function withoutScopedPilotGuards(source) {
  const guards=[
    '  if (process.env.COLZO_SCOPED_PILOT_ACCESS === "true" && !isTenancyAuthEnabled()) {\n    throw safeError(403, "An active approved pilot is required", "PILOT_ACCESS_REQUIRED");\n  }\n',
    '  if (process.env.COLZO_SCOPED_PILOT_ACCESS === "true") {\n    const { assertScopedPilotWorkspace } = await import("./colzo-pilot-workspace.js");\n    await assertScopedPilotWorkspace(membership.business_id);\n  }\n'
  ];
  for(const guard of guards){assert.equal(source.split(guard).length,2);source=source.replace(guard,'');}
  // Preserve the original protected authentication hash: only these TWO
  // new, exact, tested Preview-only blocks may differ from the legacy source.
  // Each must occur exactly once; unrelated auth edits continue to fail CI.
  const strictPreviewAdditions=[
    "\n// Disabled-by-default extra defense for the isolated scoped Development\n// Preview. This cannot affect Production or another Supabase project.\nfunction strictPreviewSessionReplayEnabled(env = process.env) {\n  return env.COLZO_PREVIEW_STRICT_SESSION_REPLAY === \"true\"\n    && env.COLZO_SCOPED_PILOT_ACCESS === \"true\"\n    && env.TENANCY_AUTH_ENABLED === \"true\"\n    && env.VERCEL_ENV === \"preview\"\n    && env.SUPABASE_URL === \"https://mvwseobgkexzpmmkgcxe.supabase.co\";\n}\n\nconst validSessionUuid = value =>\n  typeof value === \"string\"\n  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);\n",
    "  if (strictPreviewSessionReplayEnabled()) {\n    // This JWT is read only after Supabase Auth has validated it. A still-\n    // cryptographically-valid access token must also have a live Auth session.\n    const claims = parseVerifiedJwtClaims(token);\n    if (!validSessionUuid(claims?.session_id) || claims?.sub !== user.id) {\n      throw safeError(401, \"Authentication is invalid or expired\");\n    }\n    const active = await supabase(\"/rest/v1/rpc/colzo_preview_session_active\", {\n      method: \"POST\",\n      headers: { \"Content-Type\": \"application/json\" },\n      body: JSON.stringify({ p_user_id: user.id, p_session_id: claims.session_id })\n    });\n    if (active === false) throw safeError(401, \"Authentication is invalid or expired\");\n    // Missing RPC, unexpected response or database errors must never become\n    // an implicit allow. The backend-only RPC is installed separately.\n    if (active !== true) throw safeError(500, \"Server authentication is unavailable\");\n  }\n"
  ];
  for(const addition of strictPreviewAdditions){assert.equal(source.split(addition).length,2);source=source.replace(addition,'');}
  // Reviewed scoped Development-only workspace MFA denial; retain legacy hash.
  const workspaceMfaAddition="  // The scoped Development workspace must not load records behind an MFA\n  // dialog using an AAL1 session. Identity/recovery endpoints stay available.\n  if (process.env.COLZO_SCOPED_PILOT_ACCESS === \"true\"\n      && process.env.VERCEL_ENV === \"preview\"\n      && process.env.SUPABASE_URL === \"https://mvwseobgkexzpmmkgcxe.supabase.co\") {\n    const claims = parseVerifiedJwtClaims(extractBearerToken(req));\n    if (claims?.aal !== \"aal2\") {\n      throw safeError(403, \"Multi-factor authentication is required\", \"MFA_REQUIRED\");\n    }\n  }\n\n";
  assert.equal(source.split(workspaceMfaAddition).length,2);
  source=source.replace(workspaceMfaAddition,'');
  // Exact additive Dev-Preview misconfiguration denial. Preserve the
  // frozen reviewed authentication fingerprint outside these scoped changes.
  const qaPreviewGuard="// This isolated Development QA stack must never inherit legacy/unscoped\n// access if branch-specific auth settings are missing. The explicit Preview,\n// Dev project and Git-ref boundaries leave Production and unrelated branches\n// on their existing configuration until a separately approved rollout.\nfunction assertProtectedDevelopmentPreviewConfigured(env = process.env) {\n  const ref = env.VERCEL_GIT_COMMIT_REF;\n  const stack = new Set([\n    \"feature/colzo-connected-workspace-20261112\",\n    \"fix/colzo-unsaved-overlay-ci-20261115\",\n    \"qa/colzo-playwright-ci-20261115\"\n  ]);\n  const expectedTarget = \"https://mvwseobgkexzpmmkgcxe.supabase.co\";\n  const actualTarget = String(env.SUPABASE_URL || \"\").replace(/\\/+$/, \"\");\n  // Real Vercel deployments expose VERCEL=1 and the Git ref. Legacy\n  // synthetic fixtures must not impersonate the protected deployed runtime.\n  if (env.VERCEL !== \"1\" || env.VERCEL_ENV !== \"preview\" || !stack.has(ref)) return;\n\n  if (actualTarget !== expectedTarget\n      || env.TENANCY_AUTH_ENABLED !== \"true\"\n      || env.COLZO_SCOPED_PILOT_ACCESS !== \"true\") {\n    throw safeError(403, \"An active approved pilot is required\", \"PILOT_ACCESS_REQUIRED\");\n  }\n}\n\n";
  assert.equal(source.split(qaPreviewGuard).length,2);
  source=source.replace(qaPreviewGuard,'');
  const qaGuardCall="  assertProtectedDevelopmentPreviewConfigured();\n";
  assert.equal(source.split(qaGuardCall).length,4);
  source=source.replaceAll(qaGuardCall,'');
  return source;
}
