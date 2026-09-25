/**
 * Pure message-shaping for RoomSyncHub's WebSocket broadcast, split out of
 * room-sync-hub.js — that file imports 'cloudflare:workers' (for the
 * DurableObject base class) and so cannot load under a plain Node/Electron
 * test runner. This file has no such import and stays unit-testable.
 * @param {{ revision: number, at?: string, ops?: unknown[] }} payload
 * @returns {{ type: 'revision', revision: number, at: string, ops?: unknown[] } | null}
 *   null when the revision is missing/invalid — caller sends nothing.
 */
export function buildRevisionBroadcastMessage(payload) {
  const rev = Number(payload?.revision);
  if (!Number.isFinite(rev) || rev <= 0) return null;
  const out = {
    type: 'revision',
    revision: rev,
    at: payload?.at || new Date().toISOString(),
  };
  // room-sync-notify.js already size-capped this and (Part A) the ops were
  // already encrypted at the source — forwarded verbatim, no transform here.
  if (Array.isArray(payload?.ops) && payload.ops.length) out.ops = payload.ops;
  return out;
}
