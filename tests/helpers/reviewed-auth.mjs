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
  return source;
}
