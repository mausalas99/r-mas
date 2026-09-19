/** Last selected patient + default pick for cold boot. */

const LAST_PATIENT_LS = 'rpc-last-patient-id';

export function readLastSelectedPatientId() {
  try {
    return String(localStorage.getItem(LAST_PATIENT_LS) || '').trim();
  } catch {
    return '';
  }
}

/** @param {string|number|null|undefined} id */
export function writeLastSelectedPatientId(id) {
  var pid = id == null ? '' : String(id).trim();
  try {
    if (!pid || pid.indexOf('demo-') === 0) {
      localStorage.removeItem(LAST_PATIENT_LS);
      return;
    }
    localStorage.setItem(LAST_PATIENT_LS, pid);
  } catch (_e) {
    void _e;
  }
}

/**
 * @param {Array<{ id?: unknown, pinned?: boolean, archived?: boolean }>} visible
 * @param {unknown} activeId
 * @param {string} [lastId]
 * @returns {unknown}
 */
export function pickDefaultPatientId(visible, activeId, lastId) {
  if (!Array.isArray(visible) || !visible.length) return null;
  if (idInVisible(visible, activeId)) return activeId;
  if (lastId && idInVisible(visible, lastId)) return lastId;
  var pinned = visible.find(function (p) {
    return p && p.pinned && !p.archived;
  });
  if (pinned) return pinned.id;
  var live = visible.find(function (p) {
    return p && !p.archived;
  });
  return (live || visible[0]).id;
}

function idInVisible(visible, id) {
  if (id == null || id === '') return false;
  var want = String(id);
  return visible.some(function (p) {
    return p && String(p.id) === want;
  });
}
