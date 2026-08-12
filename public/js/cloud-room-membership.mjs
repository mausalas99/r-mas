/** Membresía pegajosa de sala LiveSync (localStorage). */

export const MEMBERSHIP_KEY = 'rpc-room-membership';
export const LAST_ROOM_KEY = 'rpc-last-room';
export const LEGACY_MEMBERSHIP_KEY = 'rpc-lan-room-membership';
export const LEGACY_LAST_ROOM_KEY = 'rpc-lan-last-room';

function readMembershipRaw() {
  try {
    let raw = localStorage.getItem(MEMBERSHIP_KEY);
    if (raw) return raw;
    const legacy = localStorage.getItem(LEGACY_MEMBERSHIP_KEY);
    if (!legacy) return null;
    localStorage.setItem(MEMBERSHIP_KEY, legacy);
    localStorage.removeItem(LEGACY_MEMBERSHIP_KEY);
    return legacy;
  } catch {
    return null;
  }
}

export function getRoomMembership() {
  try {
    const raw = readMembershipRaw();
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !String(o.roomId || '').trim()) return null;
    return {
      roomId: String(o.roomId).trim(),
      label: String(o.label || o.roomId).trim(),
      joinedAt: String(o.joinedAt || ''),
    };
  } catch {
    return null;
  }
}

export function setRoomMembership({ roomId, label }) {
  const id = String(roomId || '').trim();
  if (!id) return;
  const payload = {
    roomId: id,
    label: String(label || id).trim(),
    joinedAt: new Date().toISOString(),
  };
  localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(payload));
  localStorage.setItem(LAST_ROOM_KEY, id);
  try {
    localStorage.removeItem(LEGACY_MEMBERSHIP_KEY);
    localStorage.removeItem(LEGACY_LAST_ROOM_KEY);
  } catch (_e) { void _e; }
}

export function clearRoomMembership() {
  try {
    localStorage.removeItem(MEMBERSHIP_KEY);
    localStorage.removeItem(LAST_ROOM_KEY);
    localStorage.removeItem(LEGACY_MEMBERSHIP_KEY);
    localStorage.removeItem(LEGACY_LAST_ROOM_KEY);
  } catch (_e) { void _e; }
}

/** Migra last-room (nuevo o legado) si aún no hay membresía explícita. */
export function migrateLastRoomToMembership() {
  if (getRoomMembership()) return;
  try {
    let id = String(localStorage.getItem(LAST_ROOM_KEY) || '').trim();
    if (!id) {
      id = String(localStorage.getItem(LEGACY_LAST_ROOM_KEY) || '').trim();
    }
    if (!id) return;
    setRoomMembership({ roomId: id, label: id });
  } catch (_e) { void _e; }
}
