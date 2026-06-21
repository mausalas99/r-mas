import { isPurgeableHostCensusRow, isHostPatientOwnedByOtherClient } from './host-patients-annotate.mjs';
import { getLanClientId } from './runtime.mjs';
import { purgeLanPatientFromHost } from './patient-delete.mjs';

function purgeOptsForCensusItem(item) {
  return {
    registro: String(item?.row?.registro || '').trim(),
    bundleOnly: item?.row?._bundleOnly === true,
  };
}

/** @param {Array<object>} rows */
export function partitionPurgeableGhosts(rows) {
  const ghosts = (rows || []).filter(isPurgeableHostCensusRow);
  const foreignGhostCount = (rows || []).filter(function (x) {
    return x.status === 'ghost' && isHostPatientOwnedByOtherClient(x.row, getLanClientId());
  }).length;
  return { ghosts, foreignGhostCount };
}

/**
 * @param {Array<object>} ghosts
 * @param {(msg: string, type?: string) => void} showToast
 */
export async function purgeGhostRowsFromHost(ghosts, _showToast) {
  let ok = 0;
  for (const g of ghosts) {
    const res = await purgeLanPatientFromHost(String(g.row.id), purgeOptsForCensusItem(g));
    if (res?.ok) ok += 1;
  }
  return ok;
}

/** @param {number} ok @param {number} total @param {number} foreignGhostCount @param {(msg: string, type?: string) => void} showToast */
export function reportGhostPurgeResult(ok, total, foreignGhostCount, showToast) {
  if (!ok) {
    showToast('No se pudieron eliminar los fantasmas del anfitrión.', 'error');
    return;
  }
  let msg = ok + ' fantasma(s) eliminado(s) del anfitrión.';
  if (foreignGhostCount) msg += ' ' + foreignGhostCount + ' de otro equipo sin cambios.';
  showToast(msg, ok < total ? 'warn' : 'success');
}
