import assert from 'node:assert/strict';

// Permit only these exact additive denials when checking the original auth hash.
export function withoutScopedPilotGuards(source) {
  const guards=[
    '  if (process.env.COLZO_SCOPED_PILOT_ACCESS === "true" && !isTenancyAuthEnabled()) {\n    throw safeError(403, "An active approved pilot is required", "PILOT_ACCESS_REQUIRED");\n  }\n',
    '  if (process.env.COLZO_SCOPED_PILOT_ACCESS === "true") {\n    const { assertScopedPilotWorkspace } = await import("./colzo-pilot-workspace.js");\n    await assertScopedPilotWorkspace(membership.business_id);\n  }\n'
  ];
  for(const guard of guards){assert.equal(source.split(guard).length,2);source=source.replace(guard,'');}
  return source;
}
