import { createHash } from 'node:crypto';

// Pinned to the scope and projections at independently reviewed PR #83 head 390e182f.
// Update these literals only after explicit review of the exact source diff.
export const APPROVED_DATA_EXIT_BASELINE = Object.freeze({
  ownershipScope: '01c6d033d16d0999b5a2d99a5300b84cd57a79ca578d7dc985cd4a9f1366f5d6',
  projections: '70d9b38167076d24eff41ec426fd5ac5ee2d685b7c6289405721fac676c0c637'
});

export function fingerprintDataExitEntries(entries) {
  const sortedEntries = [...entries].sort(([a], [b]) => {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  });
  return createHash('sha256').update(JSON.stringify(sortedEntries)).digest('hex');
}
