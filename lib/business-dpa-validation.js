// Legal gating must verify the actual returned row, not just a nonempty id.
// This validator is shared by the public business availability card and the
// customer enquiry handler so both enforce identical tenant/version rules.
export function isCurrentBusinessDpa(rows,businessId,version) {
  if (!Array.isArray(rows) || rows.length !== 1 || !businessId || !version) return false;
  const row=rows[0];
  const id=row?.id;
  const validId=(typeof id === 'number' && Number.isSafeInteger(id) && id > 0)
    || (typeof id === 'string' && /^[1-9][0-9]{0,17}$/.test(id));
  return Boolean(row && typeof row === 'object' && !Array.isArray(row)
    && validId && row.business_id === businessId
    && row.document_key === 'dpa'
    && row.document_version === version);
}
