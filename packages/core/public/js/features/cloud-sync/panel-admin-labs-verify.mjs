import {
  listVisibleNetworkRowsWithRegistro,
  markNetworkRowLabsVerified,
  applyNetworkCensusFilters,
} from './panel-admin-html.mjs';
import { getCachedLabVerify, setCachedLabVerify } from './lab-verify-cache.mjs';

export function labRepoCheckAvailable() {
  return !!(window.electronAPI && typeof window.electronAPI.labRepoCheck === 'function');
}

/**
 * Checks each row against the lab-repo portal, stamps the DOM, and caches
 * the result. Shared by the manual "Verificar labs" button and the
 * automatic on-load check below.
 * @param {Array<{ tr: HTMLTableRowElement, registro: string, patientId: string }>} rows
 * @param {(progress: { index: number, total: number }) => void} [onProgress]
 * @returns {Promise<{ ok: number, failed: number }>}
 */
export async function verifyNetworkLabsRows(rows, onProgress) {
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += 1) {
    onProgress?.({ index: i, total: rows.length });
    try {
      const res = await window.electronAPI.labRepoCheck({ registro: rows[i].registro });
      if (res && typeof res.hasStudies === 'boolean') {
        markNetworkRowLabsVerified(rows[i].tr, res.hasStudies, res.lastFechaSolicitud);
        if (rows[i].patientId) setCachedLabVerify(rows[i].patientId, res.hasStudies, res.lastFechaSolicitud);
        ok += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }
  return { ok, failed };
}

// ponytail: 1h cooldown so opening/reloading the Red tab doesn't re-hit the
// portal's single cookie session for every patient every time — raise or
// drop it if admins want fresher auto-checks sooner.
const AUTO_VERIFY_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * Runs on every Red census load: auto-verifies visible rows whose cached
 * check is missing or older than the cooldown, so the "Verificar labs"
 * state stays current without a manual click each time.
 * @param {HTMLElement} root
 */
export async function autoVerifyStaleNetworkLabs(root) {
  if (!labRepoCheckAvailable()) return;
  const rows = listVisibleNetworkRowsWithRegistro(root).filter((row) => {
    const cached = row.patientId && getCachedLabVerify(row.patientId);
    return !cached || Date.now() - cached.checkedAt > AUTO_VERIFY_COOLDOWN_MS;
  });
  if (!rows.length) return;
  await verifyNetworkLabsRows(rows);
  applyNetworkCensusFilters(root);
}
