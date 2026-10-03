const FEATURES = Object.freeze({
  ai_receptionist: 'ai_receptionist_paused',
  marketing_generation: 'marketing_generation_paused',
  marketing_publishing: 'marketing_publishing_paused',
  automatic_followups: 'automatic_followups_paused',
  customer_submissions: 'customer_submissions_paused'
});

const CONTROL_COLUMNS = Object.freeze(Object.values(FEATURES));

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

function incidentError(message, code = 'INCIDENT_CONTROL_UNAVAILABLE') {
  const error = new Error(message);
  error.status = 503;
  error.code = code;
  return error;
}

async function storage(path, options = {}) {
  const connection = config();
  if (!connection) throw incidentError('Incident controls are unavailable');
  let response;
  try {
    response = await fetch(`${connection.url}/rest/v1/${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: connection.key,
        Authorization: `Bearer ${connection.key}`,
        ...(options.headers || {})
      }
    });
  } catch {
    throw incidentError('Incident controls are unavailable');
  }
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw incidentError('Incident controls are unavailable');
  return data;
}

function normalise(row = {}) {
  const output = {};
  for (const column of CONTROL_COLUMNS) output[column] = row?.[column] === true;
  return output;
}

export async function getIncidentControls(businessId) {
  if (typeof businessId !== 'string' || !businessId.trim()) throw incidentError('Incident controls are unavailable');
  const select = ['business_id', ...CONTROL_COLUMNS, 'reason', 'updated_by', 'updated_at'].join(',');
  const platformSelect = ['id', ...CONTROL_COLUMNS, 'updated_at'].join(',');
  const [businessRows, platformRows] = await Promise.all([
    storage(`business_incident_controls?business_id=eq.${encodeURIComponent(businessId)}&select=${select}&limit=1`),
    storage(`platform_incident_controls?id=eq.global&select=${platformSelect}&limit=1`)
  ]);
  const businessRow = Array.isArray(businessRows) ? businessRows[0] || null : null;
  const platformRow = Array.isArray(platformRows) ? platformRows[0] || null : null;
  if (!platformRow) throw incidentError('Incident controls are unavailable');
  const business = normalise(businessRow || {});
  const platform = normalise(platformRow);
  const effective = {};
  for (const column of CONTROL_COLUMNS) effective[column] = business[column] || platform[column];
  return {
    business: {
      ...business,
      reason: typeof businessRow?.reason === 'string' ? businessRow.reason : '',
      updated_by: businessRow?.updated_by || null,
      updated_at: businessRow?.updated_at || null
    },
    platform,
    effective,
    platform_updated_at: platformRow.updated_at || null
  };
}

export async function assertIncidentFeatureAvailable(businessId, feature) {
  const column = FEATURES[feature];
  if (!column) throw incidentError('Incident controls are unavailable');
  const state = await getIncidentControls(businessId);
  if (state.effective[column]) {
    throw incidentError('This feature is temporarily paused for safety', 'INCIDENT_PAUSED');
  }
  return state;
}

export async function isIncidentFeaturePaused(businessId, feature) {
  try {
    await assertIncidentFeatureAvailable(businessId, feature);
    return false;
  } catch {
    return true;
  }
}

export async function updateBusinessIncidentControls({ businessId, actorUserId, values, reason }) {
  if (typeof businessId !== 'string' || !businessId.trim()) throw incidentError('Incident controls are unavailable');
  const payload = { business_id: businessId, updated_by: actorUserId || null, updated_at: new Date().toISOString() };
  for (const column of CONTROL_COLUMNS) {
    if (Object.hasOwn(values, column)) payload[column] = values[column] === true;
  }
  if (typeof reason === 'string') payload.reason = reason.trim().slice(0, 500);
  const rows = await storage('business_incident_controls?on_conflict=business_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });
  if (!rows?.[0]) throw incidentError('Incident controls could not be updated');
  return getIncidentControls(businessId);
}

export const INCIDENT_FEATURES = FEATURES;
