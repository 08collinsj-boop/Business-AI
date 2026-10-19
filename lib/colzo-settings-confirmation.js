// Strict Colzo Preview persistence confirmation. A successful HTTP response
// alone does not establish that the requested tenant-scoped row was saved.
export function confirmSettingsSave(data, current, businessId, updates) {
  if (Array.isArray(data) && data.length === 0) {
    return { status: 409, error: 'Settings changed or are unavailable. Reload before retrying.' };
  }
  if (!Array.isArray(data) || data.length !== 1) {
    return { status: 503, error: 'Settings could not be confirmed. Reload before retrying.' };
  }
  const row = data[0];
  if (!row || typeof row !== 'object' || Array.isArray(row)
      || String(row.id ?? '') !== String(current?.id ?? '')
      || String(row.business_id ?? '') !== String(businessId ?? '')) {
    return { status: 503, error: 'Settings could not be confirmed. Reload before retrying.' };
  }
  for (const [field,value] of Object.entries(updates)) {
    if (field === 'updated_at') continue;
    if (!Object.hasOwn(row,field) || row[field] !== value) {
      return { status: 503, error: 'Settings could not be confirmed. Reload before retrying.' };
    }
  }
  return { status: 200, record: row };
}
