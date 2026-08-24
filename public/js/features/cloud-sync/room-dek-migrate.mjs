/**
 * Backfill E2EE for rooms created before encryption shipped. `room-dek.mjs`'s
 * `ensureRoomDek` only ever ran once, at room-creation time — a room that already
 * existed never gets a DEK on its own. Users can't be asked to "recreate the room",
 * so this runs silently on the owner's next login: create the DEK if missing, then
 * re-push every already-stored plaintext content field so it gets encrypted too.
 *
 * Owner-only because the Worker only lets the room owner set a DEK
 * (cloud/sync-worker/src/room-dek.js: handlePutRoomDek, 403 otherwise).
 */
import { ensureRoomDek, loadRoomDek, getCachedRoomDek } from './room-dek.mjs';
import { isEncryptedEnvelope } from './crypto.mjs';
import { isEncryptedContentPath, listContentFieldEntries } from './cloud-sync-crypto-wire.mjs';
import { pushCloudOpsDirect } from './cloud-push-direct.mjs';
import { auditDekEvent, DEK_EVENTS } from './cloud-sync-audit.mjs';

/**
 * ISO timestamp + 1ms. The Worker's LWW (`lww.js: isNewerVersion`) rejects an op
 * whose `updatedAt`+`actorId` exactly ties the stored version as stale — so an
 * exact echo of the current value would silently never get written (and never
 * get encrypted). Bumping by the smallest possible increment off the field's own
 * prior clock (never "now") guarantees the echo is accepted, while staying far
 * behind any genuinely newer edit from a teammate, which is always stamped near
 * "now" and so still correctly wins if it races this sweep.
 * @param {string} iso
 * @returns {string}
 */
export function bumpTimestamp(iso) {
  const t = new Date(String(iso || '')).getTime();
  if (!Number.isFinite(t)) return String(iso || '');
  return new Date(t + 1).toISOString();
}

/**
 * Folds an ops array (revision ASC) down to the latest op per path — the same
 * shape the Worker's `entityVersions` already tracks server-side. Used only when
 * a `since:0` pull returns raw ops instead of a full snapshot (small/new room,
 * revision <= PULL_REVISION_GAP in cloud/sync-worker/src/pull-strategy.js).
 * @param {{path?: string, value?: unknown, updatedAt?: string, actorId?: string}[]} ops
 * @returns {Record<string, {value: unknown, updatedAt: string, actorId: string}>}
 */
export function foldOpsToLatestByPath(ops) {
  const out = {};
  for (const op of Array.isArray(ops) ? ops : []) {
    if (!op || typeof op.path !== 'string' || !op.path) continue;
    out[op.path] = { value: op.value, updatedAt: String(op.updatedAt || ''), actorId: String(op.actorId || '') };
  }
  return out;
}

/**
 * Reduces a full-state pull's content fields to the same {path: {value, updatedAt,
 * actorId}} shape `foldOpsToLatestByPath` produces for the small-room case, reading
 * clocks from the state's own `entityVersions`.
 * @param {Record<string, any>} state
 * @returns {Record<string, {value: unknown, updatedAt: string, actorId: string}>}
 */
function foldStateToLatestByPath(state) {
  const out = {};
  for (const { path, value } of listContentFieldEntries(state)) {
    const version = state.entityVersions?.[path];
    if (!version) continue;
    out[path] = { value, updatedAt: String(version.updatedAt || ''), actorId: String(version.actorId || '') };
  }
  return out;
}

/**
 * @param {Record<string, {value: unknown, updatedAt: string, actorId: string}>} byPath
 * @param {string} actorId
 * @returns {{path: string, value: unknown, updatedAt: string, actorId: string}[]}
 */
function buildReencryptOps(byPath, actorId) {
  const ops = [];
  for (const [path, entry] of Object.entries(byPath)) {
    if (!isEncryptedContentPath(path)) continue;
    if (isEncryptedEnvelope(entry.value)) continue;
    if (!entry.updatedAt) continue;
    ops.push({ path, value: entry.value, updatedAt: bumpTimestamp(entry.updatedAt), actorId });
  }
  return ops;
}

/**
 * Groups ops by entity — the first two path segments: `entries/{id}`,
 * `labSidecars/{id}`, `todos/{id}`, or the bare `clinicalOps` root. Same
 * granularity normal incremental writes already use per entity.
 * @param {{path: string}[]} ops
 * @returns {Map<string, object[]>}
 */
function groupOpsByEntity(ops) {
  const groups = new Map();
  for (const op of ops) {
    const key = op.path.split('/').slice(0, 2).join('/');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(op);
  }
  return groups;
}

/**
 * Pulls the room's authoritative current content and re-pushes any field that
 * isn't an encrypted envelope yet. `api.push` (api-client.mjs) already encrypts
 * any op whose path matches `isEncryptedContentPath` transparently once a DEK is
 * cached — this only has to get the (path, value, clock) right and reuse the
 * existing push pipeline (chunking, retries) via `pushCloudOpsDirect`.
 *
 * Pushed one entity (patient/lab/todo) at a time instead of one giant batch: a
 * failure on one patient's oversized history (D1's 2MB row cap, base64 overhead)
 * can't block every other patient from getting encrypted, and audit events point
 * at exactly which entity failed.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 * @param {string} actorId
 * @returns {Promise<{ swept: number, failed: number }>}
 */
export async function sweepRoomForPlaintextContent(api, roomId, actorId) {
  const data = await api.pull(roomId, 0);
  const byPath = data?.state ? foldStateToLatestByPath(data.state) : foldOpsToLatestByPath(data?.ops);
  const ops = buildReencryptOps(byPath, actorId);
  if (!ops.length) return { swept: 0, failed: 0 };

  const revisionRef = { current: Number(data?.revision) || 0 };
  let swept = 0;
  let failed = 0;
  for (const [entityKey, entityOps] of groupOpsByEntity(ops)) {
    const ok = await pushEntityOps(api, roomId, entityKey, entityOps, revisionRef);
    if (ok) swept += entityOps.length;
    else failed += 1;
  }
  return { swept, failed };
}

/**
 * Pushes one entity's ops; swallows and audits a failure so the caller can
 * keep sweeping the rest instead of aborting the whole backfill.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 * @param {string} entityKey
 * @param {object[]} entityOps
 * @param {{ current: number }} revisionRef
 * @returns {Promise<boolean>}
 */
async function pushEntityOps(api, roomId, entityKey, entityOps, revisionRef) {
  try {
    await pushCloudOpsDirect(
      api,
      roomId,
      entityOps,
      () => revisionRef.current,
      (next) => {
        revisionRef.current = next;
      }
    );
    return true;
  } catch (err) {
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, {
      roomId,
      phase: 'backfill-sweep',
      entity: entityKey,
      message: String(err?.message || err),
    });
    return false;
  }
}

/**
 * Re-pulls the room after a sweep and counts content fields still not encrypted
 * — catches both a swallowed push failure and S1-5's small-room ops-purge gap.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 * @returns {Promise<number>}
 */
async function countRemainingPlaintext(api, roomId) {
  const data = await api.pull(roomId, 0);
  const byPath = data?.state ? foldStateToLatestByPath(data.state) : foldOpsToLatestByPath(data?.ops);
  let count = 0;
  for (const [path, entry] of Object.entries(byPath)) {
    if (isEncryptedContentPath(path) && !isEncryptedEnvelope(entry.value)) count += 1;
  }
  return count;
}

/**
 * Owner-only, fire-and-forget: ensures this room has a DEK (creating one if this
 * is the first device to notice it's missing), then sweeps already-stored
 * plaintext content into ciphertext. No-op for a non-owner — the Worker would
 * 403 anyway, so the guard here is just to skip the wasted round trip.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {{ id?: string, role?: string, code?: string }} room
 * @param {string} actorId
 * @returns {Promise<{ swept: number, failed: number, remaining: number } | null>}
 */
export async function backfillRoomEncryption(api, room, actorId) {
  const roomId = String(room?.id || '');
  const roomCode = String(room?.code || '');
  if (!roomId || room?.role !== 'owner') return null;

  const dek =
    getCachedRoomDek(roomId) ||
    (await loadRoomDek(api, roomId, roomCode).catch(() => null)) ||
    (await ensureRoomDek(api, roomId, roomCode).catch(() => null));
  if (!dek) return null;

  return sweepAndVerify(api, roomId, actorId);
}

/**
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 * @param {string} actorId
 */
async function sweepAndVerify(api, roomId, actorId) {
  try {
    const result = await sweepRoomForPlaintextContent(api, roomId, actorId);
    const remaining = await countRemainingPlaintext(api, roomId).catch(() => -1);
    await auditDekEvent(DEK_EVENTS.BACKFILL_SWEPT, { roomId, swept: result.swept, failed: result.failed, remaining });
    return { ...result, remaining };
  } catch (err) {
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, {
      roomId,
      phase: 'backfill-sweep',
      message: String(err?.message || err),
    });
    return null;
  }
}
