/**
 * Human-readable cloud room label for admin lists and Conexión chrome.
 * @param {{ sala?: unknown, code?: unknown, id?: unknown, turnKey?: unknown, memberCount?: unknown, name?: unknown }} room
 * @returns {string}
 */
export function formatCloudRoomLabel(room) {
  const sala = String(room?.sala || '').trim() || 'Sala';
  const codePart = nonEmpty(room?.code);
  const parts = [sala]
    .concat(nonEmpty(room?.turnKey))
    .concat(codePart.length ? codePart : nonEmpty(room?.id))
    .concat(extraName(sala, room?.name));
  return appendMemberCount(parts.filter(Boolean).join(' · '), room?.memberCount);
}

/** @param {unknown} value @returns {string[]} */
function nonEmpty(value) {
  const s = String(value || '').trim();
  return s ? [s] : [];
}

/** @param {string} sala @param {unknown} name @returns {string[]} */
function extraName(sala, name) {
  const s = String(name || '').trim();
  if (!s || s.toLowerCase() === sala.toLowerCase()) return [];
  return [s];
}

/** @param {string} label @param {unknown} members */
function appendMemberCount(label, members) {
  if (members == null || !Number.isFinite(Number(members))) return label;
  const n = Number(members);
  return label + ' · ' + n + (n === 1 ? ' miembro' : ' miembros');
}
