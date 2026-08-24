/**
 * Fingerprints + index for Nube lab sidecars — skip re-push when server already has the same parsed set.
 */
import { canonicalStringify } from '../../../../lib/db/canonical-json.mjs';
import { labSetTimestamp } from '../../patient-merge.mjs';
import { slimLabSetForCloud } from './cloud-op-slim.mjs';
import { cloudOp, labSetId } from './mutate-bridge-ops.mjs';
import { createOpFold, foldCloudOp } from './pull-apply-state.mjs';

export const CLOUD_LAB_FP_INDEX_KEY = 'rpc-cloud-sync-lab-fp-index';
export const CLOUD_LAB_POISON_KEY = 'rpc-cloud-sync-lab-poison';

/** @param {unknown} set */
export function cloudLabSidecarFingerprint(set) {
  return canonicalStringify(slimLabSetForCloud(set));
}

/** @param {{ path?: string, value?: unknown }} op */
export function cloudLabSidecarOpFingerprint(op) {
  return cloudLabSidecarFingerprint(op?.value);
}

/** @param {string} path */
export function isCloudLabSidecarPath(path) {
  return String(path || '').startsWith('labSidecars/');
}

/** @param {string} path */
export function parseCloudLabSidecarPath(path) {
  const m = /^labSidecars\/([^/]+)\/([^/]+)$/.exec(String(path || '').trim());
  if (!m) return null;
  return { patientId: m[1], setId: m[2], path: `labSidecars/${m[1]}/${m[2]}` };
}

/** @returns {Record<string, { fp: string, at: number, src?: string }>} */
function readLabFingerprintIndex() {
  try {
    const raw = localStorage.getItem(CLOUD_LAB_FP_INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, { fp: string, at: number, src?: string }>} index */
function writeLabFingerprintIndex(index) {
  try {
    localStorage.setItem(CLOUD_LAB_FP_INDEX_KEY, JSON.stringify(index));
  } catch {
    /* ignore quota */
  }
}

/** @returns {Set<string>} */
function readLabPoisonPaths() {
  try {
    const raw = localStorage.getItem(CLOUD_LAB_POISON_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

/** @param {Set<string>} paths */
function writeLabPoisonPaths(paths) {
  try {
    localStorage.setItem(CLOUD_LAB_POISON_KEY, JSON.stringify([...paths]));
  } catch {
    /* ignore quota */
  }
}

/** @param {string} path */
export function markCloudLabOpPoison(path) {
  const p = String(path || '').trim();
  if (!p || !isCloudLabSidecarPath(p)) return;
  const set = readLabPoisonPaths();
  if (set.has(p)) return;
  set.add(p);
  writeLabPoisonPaths(set);
}

/**
 * @param {string} path
 * @param {Set<string>} [poisonSet]
 */
export function isCloudLabOpPoison(path, poisonSet) {
  const set = poisonSet || readLabPoisonPaths();
  return set.has(String(path || '').trim());
}

/**
 * @param {string} patientId
 * @param {unknown} set
 * @param {string} [setId]
 * @param {Record<string, { fp: string, at: number, src?: string }>} [index]
 */
export function shouldSkipCloudLabSidecarPush(patientId, set, setId, index) {
  const sid = String(setId || labSetId(set, 0) || '').trim();
  const pid = String(patientId || '').trim();
  if (!pid || !sid) return true;
  const path = `labSidecars/${pid}/${sid}`;
  const fp = cloudLabSidecarFingerprint(set);
  const idx = index || readLabFingerprintIndex();
  return idx[path]?.fp === fp;
}

/**
 * @param {string} patientId
 * @param {unknown[]} labs
 * @param {{ actorId: string, updatedAt: string }} meta
 */
export function buildDirtyLabSidecarOpsForPatient(patientId, labs, meta) {
  const ops = [];
  const actorId = meta.actorId;
  const batchAt = meta.updatedAt;
  const list = Array.isArray(labs) ? labs : [];
  const idx = readLabFingerprintIndex();
  const poisonPaths = readLabPoisonPaths();
  for (let i = 0; i < list.length; i += 1) {
    const set = list[i];
    const setId = labSetId(set, i);
    if (!setId) continue;
    const opPath = `labSidecars/${patientId}/${setId}`;
    if (isCloudLabOpPoison(opPath, poisonPaths)) continue;
    if (shouldSkipCloudLabSidecarPush(patientId, set, setId, idx)) continue;
    const labAt = String(labSetTimestamp(set) || '').trim() || batchAt;
    ops.push(
      cloudOp({
        path: opPath,
        value: slimLabSetForCloud(set),
        actorId,
        updatedAt: labAt,
      })
    );
  }
  return ops;
}

/** @param {Record<string, unknown>} state */
export function noteCloudLabSidecarsFromState(state) {
  const labSidecars = state?.labSidecars;
  if (!labSidecars || typeof labSidecars !== 'object') return 0;
  const idx = readLabFingerprintIndex();
  let n = 0;
  for (const pid of Object.keys(labSidecars)) {
    const sets = labSidecars[pid];
    if (!sets || typeof sets !== 'object') continue;
    for (const setId of Object.keys(sets)) {
      const value = sets[setId];
      if (!value || typeof value !== 'object') continue;
      const path = `labSidecars/${pid}/${setId}`;
      idx[path] = { fp: cloudLabSidecarFingerprint(value), at: Date.now(), src: 'pull' };
      n += 1;
    }
  }
  writeLabFingerprintIndex(idx);
  return n;
}

/** @param {import('./pull-apply-state.mjs').OpFold} fold */
export function noteCloudLabSidecarsFromFold(fold) {
  const map = fold?.labSidecars;
  if (!map || typeof map !== 'object') return 0;
  const idx = readLabFingerprintIndex();
  let n = 0;
  for (const pid of Object.keys(map)) {
    const sets = map[pid];
    if (!sets || typeof sets !== 'object') continue;
    for (const setId of Object.keys(sets)) {
      const value = sets[setId];
      if (!value || typeof value !== 'object') continue;
      const path = `labSidecars/${pid}/${setId}`;
      idx[path] = { fp: cloudLabSidecarFingerprint(value), at: Date.now(), src: 'pull' };
      n += 1;
    }
  }
  writeLabFingerprintIndex(idx);
  return n;
}

/** @param {unknown} result */
export function noteCloudLabSidecarsFromPullResult(result) {
  if (!result || typeof result !== 'object') return 0;
  /** @type {{ state?: Record<string, unknown>, ops?: unknown[] }} */
  const row = result;
  if (row.state) return noteCloudLabSidecarsFromState(row.state);
  if (!Array.isArray(row.ops) || !row.ops.length) return 0;
  const fold = createOpFold();
  for (let i = 0; i < row.ops.length; i += 1) {
    foldCloudOp(fold, row.ops[i]);
  }
  return noteCloudLabSidecarsFromFold(fold);
}

/** Fingerprint the pre-trim value so a quota-shrunk lab set still matches next sync. */
export function noteCloudLabSidecarOpsSent(originalOps, sentOps) {
  if (!Array.isArray(sentOps) || !sentOps.length) return 0;
  const sentPaths = new Set(sentOps.map((op) => String(op?.path || '')));
  const originals = (Array.isArray(originalOps) ? originalOps : []).filter((op) =>
    sentPaths.has(String(op?.path || ''))
  );
  return noteCloudLabSidecarOpsPushed(originals);
}

/** @param {unknown[]} ops */
export function noteCloudLabSidecarOpsPushed(ops) {
  if (!Array.isArray(ops) || !ops.length) return 0;
  const idx = readLabFingerprintIndex();
  let n = 0;
  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];
    if (!op || typeof op !== 'object') continue;
    const path = String(op.path || '');
    if (!isCloudLabSidecarPath(path)) continue;
    idx[path] = { fp: cloudLabSidecarOpFingerprint(op), at: Date.now(), src: 'push' };
    n += 1;
  }
  writeLabFingerprintIndex(idx);
  return n;
}

/**
 * Drop lab ops already on Nube (same slim fingerprint). Keeps non-lab ops.
 * @param {unknown[]} ops
 */
export function filterCloudLabSidecarOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return [];
  const idx = readLabFingerprintIndex();
  return ops.filter(function (op) {
    if (!op || typeof op !== 'object') return false;
    const path = String(op.path || '');
    if (!isCloudLabSidecarPath(path)) return true;
    return idx[path]?.fp !== cloudLabSidecarOpFingerprint(op);
  });
}

/**
 * One op per labSidecars path — keep the row with the latest updatedAt.
 * @param {unknown[]} ops
 */
export function coalesceLabSidecarOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return [];
  /** @type {unknown[]} */
  const rest = [];
  /** @type {Map<string, unknown>} */
  const byPath = new Map();
  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];
    if (!op || typeof op !== 'object') continue;
    const path = String(op.path || '');
    if (!isCloudLabSidecarPath(path)) {
      rest.push(op);
      continue;
    }
    const prev = byPath.get(path);
    if (!prev) {
      byPath.set(path, op);
      continue;
    }
    const prevAt = String(/** @type {{ updatedAt?: string }} */ (prev).updatedAt || '');
    const nextAt = String(/** @type {{ updatedAt?: string }} */ (op).updatedAt || '');
    if (nextAt >= prevAt) byPath.set(path, op);
  }
  return rest.concat(Array.from(byPath.values()));
}

/** @param {string} clientMutationId */
export function isLabSidecarOutboxMutationId(clientMutationId) {
  const id = String(clientMutationId || '');
  return id.startsWith('labSidecars/') || id === 'cloud-lab-backfill';
}
