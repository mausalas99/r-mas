/** When revision gap exceeds this, return encrypted snapshot instead of ops. */
export const PULL_REVISION_GAP = 100;
/** Soft cap on cumulative ops_json before forcing a snapshot. */
export const PULL_OPS_MAX_BYTES = 256 * 1024;
/** Keep this many recent mutations for incremental peers; older rows are pruned. */
export const MUTATION_RETENTION = PULL_REVISION_GAP;

/**
 * Large gaps must NOT SELECT mutations — loading 1000+ ops_json rows OOMs the D1 isolate
 * (Sala 2 hit ~120MB ops history at rev ~1550).
 * @param {number} gap
 * @param {number} [cumulativeOpsBytes]
 */
export function shouldReturnSnapshotPull(gap, cumulativeOpsBytes = 0) {
  const g = Number(gap) || 0;
  const bytes = Number(cumulativeOpsBytes) || 0;
  return g > PULL_REVISION_GAP || bytes > PULL_OPS_MAX_BYTES;
}

/**
 * @param {number} roomRevision
 * @returns {number} delete mutations with revision <= this (0 = keep all)
 */
export function mutationPruneCeiling(roomRevision) {
  const rev = Number(roomRevision) || 0;
  if (rev <= MUTATION_RETENTION) return 0;
  return rev - MUTATION_RETENTION;
}
