/** Acento sutil por rama clínica en Patologías. */

export const PATHOLOGY_BRANCH_COLOR_PREFIX = 'manejo-pathology-branch';

/** @param {string} branchId */
export function pathologyBranchCssClass(branchId) {
  if (!branchId || branchId === 'all') return '';
  return PATHOLOGY_BRANCH_COLOR_PREFIX + '--' + branchId;
}
