// Exact loaded versions are compared as strings; Date.parse drops microseconds.
export function validWorkVersion(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}
export function nextWorkVersion(value) {
  return new Date(Math.max(Date.now(),Date.parse(value)+1)).toISOString();
}
