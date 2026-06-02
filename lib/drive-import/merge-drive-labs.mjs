/**
 * @param {string} fecha
 * @returns {string}
 */
function normalizeFecha(fecha) {
  return String(fecha || '').trim();
}

/**
 * @param {string[]} lines
 * @returns {string[]}
 */
function normalizeLabLines(lines) {
  return (Array.isArray(lines) ? lines : [])
    .map(function (line) {
      return String(line || '')
        .trim()
        .replace(/\s+/g, ' ');
    })
    .filter(Boolean);
}

/**
 * @param {string[]} a
 * @param {string[]} b
 * @returns {boolean}
 */
export function areDriveLabSetsEquivalent(a, b) {
  const aa = normalizeLabLines(a);
  const bb = normalizeLabLines(b);
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i += 1) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
}

/**
 * @param {{ fecha?: string, hora?: string, resLabs?: string[] }} existing
 * @param {{ fecha?: string, hora?: string, resLabs?: string[] }} incoming
 * @returns {boolean}
 */
export function isDuplicateDriveLabSet(existing, incoming) {
  if (!existing || !incoming) return false;
  if (normalizeFecha(existing.fecha) !== normalizeFecha(incoming.fecha)) return false;
  const eh = String(existing.hora || '').trim();
  const ih = String(incoming.hora || '').trim();
  if (eh !== ih) return false;
  return areDriveLabSetsEquivalent(existing.resLabs || [], incoming.resLabs || []);
}

/**
 * @param {Array<{ fecha?: string, hora?: string, resLabs?: string[] }>} existingHistory
 * @param {Array<{ fecha?: string, hora?: string, resLabs?: string[] }>} incomingSets
 * @returns {{ sets: typeof incomingSets, skipped: number }}
 */
export function filterNewDriveLabSets(existingHistory, incomingSets) {
  let skipped = 0;
  /** @type {typeof incomingSets} */
  const fresh = [];
  (incomingSets || []).forEach(function (set) {
    const dup = (existingHistory || []).some(function (ex) {
      return isDuplicateDriveLabSet(ex, set);
    });
    if (dup) skipped += 1;
    else fresh.push(set);
  });
  return { sets: fresh, skipped: skipped };
}
