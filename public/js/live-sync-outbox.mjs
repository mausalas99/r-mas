/** Cola offline de bundles/patches LiveSync por sala. */

const OUTBOX_KEY = 'rpc-lan-sync-outbox';
const MAX_ITEMS_PER_ROOM = 50;

function readAll() {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : {};
  } catch (_e) {
    return {};
  }
}

function writeAll(map) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(map));
}

/**
 * @param {string} roomId
 * @param {{ kind: 'bundle'|'patch', payload: object, enqueuedAt?: string }} item
 */
export function enqueueOutbox(roomId, item) {
  const rid = String(roomId || '').trim();
  if (!rid || !item || !item.payload) return;
  const all = readAll();
  const list = Array.isArray(all[rid]) ? all[rid].slice() : [];
  list.push({
    kind: item.kind === 'patch' ? 'patch' : 'bundle',
    payload: item.payload,
    enqueuedAt: item.enqueuedAt || new Date().toISOString(),
  });
  while (list.length > MAX_ITEMS_PER_ROOM) list.shift();
  all[rid] = list;
  writeAll(all);
}

/** @param {string} roomId @returns {object[]} */
export function drainOutbox(roomId) {
  const rid = String(roomId || '').trim();
  if (!rid) return [];
  const all = readAll();
  const list = Array.isArray(all[rid]) ? all[rid].slice() : [];
  delete all[rid];
  writeAll(all);
  return list;
}

/** @param {string} roomId */
export function outboxSize(roomId) {
  const rid = String(roomId || '').trim();
  if (!rid) return 0;
  const all = readAll();
  const list = all[rid];
  return Array.isArray(list) ? list.length : 0;
}

/** @param {string} roomId */
export function peekOutbox(roomId) {
  const rid = String(roomId || '').trim();
  if (!rid) return [];
  const all = readAll();
  const list = all[rid];
  return Array.isArray(list) ? list.slice() : [];
}
