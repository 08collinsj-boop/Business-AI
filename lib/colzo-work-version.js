// Exact loaded versions are compared as strings; Date.parse drops microseconds.
export function validWorkVersion(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}
export function nextWorkVersion(value) {
  return new Date(Math.max(Date.now(),Date.parse(value)+1)).toISOString();
}


// A PostgreSQL timestamptz can carry six fractional digits. Date.parse only
// preserves milliseconds; a committed row with different microseconds must
// never be accepted as confirmation of the version requested by the editor.
export function sameWorkVersion(left,right) {
  if (!validWorkVersion(left) || !validWorkVersion(right)) return false;
  if (Date.parse(left) !== Date.parse(right)) return false;
  const submillis=value=>{
    const fraction=/\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/.exec(value)?.[1] || '';
    return fraction.padEnd(6,'0').slice(3);
  };
  return submillis(left) === submillis(right);
}
