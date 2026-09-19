const ALLOWED = [
  /^entries\/[^/]+\/monitoreo$/,
  /^entries\/[^/]+\/estadoActual$/,
  /^entries\/[^/]+\/note$/,
  /^entries\/[^/]+\/indicaciones$/,
  /^todos\/[^/]+$/,
];

/** @param {string} path */
function isAllowedCloudMobilePath(path) {
  const p = String(path || '').trim();
  if (!p) return false;
  return ALLOWED.some((re) => re.test(p));
}

/** @param {unknown[]} ops */
export function filterOpsForCloudMobile(ops) {
  if (!Array.isArray(ops)) return [];
  return ops.filter((op) => {
    if (!op || typeof op !== 'object') return false;
    /** @type {{ path?: unknown }} */
    const row = op;
    return isAllowedCloudMobilePath(String(row.path || ''));
  });
}
