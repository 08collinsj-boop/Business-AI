import { getBusinessEntitlements } from './billing.js';

// Called only after server-verified identity, membership and role checks.
// Exhausted AI allowance does not remove access to existing workspace records.
export async function assertScopedPilotWorkspace(businessId) {
  const entitlement = await getBusinessEntitlements(businessId);
  if (entitlement.enforced && entitlement.active && entitlement.pilotFreeAccess) return;
  throw Object.assign(new Error('An active approved pilot is required'), {
    status: 403, code: 'PILOT_ACCESS_REQUIRED'
  });
}
