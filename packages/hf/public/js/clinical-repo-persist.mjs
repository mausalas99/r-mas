/**
 * Clinical durability via clinical-repo (P5).
 *
 * When IPC is available, always uses clinical.persistSnapshot — do NOT gate on
 * isClinicalRepoPersistEnabled (that flag may remain for other experiments, but
 * must not block durability on the new persistClinicalState path).
 *
 * Debounces non-immediate calls (~400ms). Immediate calls coalesce: if a persist
 * is in-flight, at most one follow-up runs and re-snapshots at follow-up start
 * (avoids stale full-snapshot last-write-wins).
 */

import { canExecuteClinicalCommand, executeClinicalCommand } from './clinical-repo-client.mjs';
import { _applyRepoSnapshot } from './clinical-read-model.mjs';
import { isWebClinicalClient } from './db-storage-bridge.mjs';
import { storage } from './storage.js';
import { scheduleIdle } from './deferred-work.mjs';
import {
  getClinicalPersistSnapshot,
  invokeBeforeSaveHook,
  invokeAfterSaveHook,
  notifySaveResultHook,
} from './app-state.mjs';

/** @type {ReturnType<typeof setTimeout>|null} */
let _persistTimer = null;
/** @type {Promise<unknown>|null} */
let _persistInFlight = null;
/** Shared tail promise for coalesced follow-up (one re-snapshot). */
let _coalesceTail = null;
let _flushQueued = false;
/** @type {Array<(value: unknown) => void>} */
let _debounceResolvers = [];
const PERSIST_DEBOUNCE_MS = 400;
const IDLE_FULL_PERSIST_MS = 8000;

let _idleFullPersistQueued = false;

/**
 * @param {{ domains?: string[] }} [opts]
 * @returns {Record<string, unknown>}
 */
function snapshotForPersist(opts = {}) {
  const full = getClinicalPersistSnapshot();
  const domains = opts && Array.isArray(opts.domains) ? opts.domains : null;
  if (!domains || !domains.length) return full;
  /** @type {Record<string, unknown>} */
  const out = {};
  for (let i = 0; i < domains.length; i += 1) {
    const key = String(domains[i] || '');
    if (!key || full[key] === undefined) continue;
    out[key] = full[key];
  }
  return Object.keys(out).length ? out : full;
}

/**
 * @param {Record<string, unknown>} snapshot
 * @returns {Promise<unknown>}
 */
function legacySaveAll(snapshot) {
  return storage.saveAll(
    snapshot.patients,
    snapshot.notes,
    snapshot.indicaciones,
    snapshot.labHistory,
    snapshot.medRecetaByPatient,
    snapshot.listadoProblemas,
    snapshot.recetaHuByPatient,
    snapshot.vpoByPatient,
    snapshot.medPharmProfileByPatient
  );
}

function clearPersistTimer() {
  if (_persistTimer) {
    clearTimeout(_persistTimer);
    _persistTimer = null;
  }
}

/** @param {Promise<unknown>|unknown} resultPromise */
function resolveDebounceWaiters(resultPromise) {
  const resolvers = _debounceResolvers.splice(0);
  if (!resolvers.length) return;
  Promise.resolve(resultPromise).then((result) => {
    for (let i = 0; i < resolvers.length; i += 1) resolvers[i](result);
  });
}

/**
 * @param {{ immediate?: boolean, source?: string }} [opts]
 * @returns {Promise<{ ok: boolean, error?: string } & Record<string, unknown>>}
 */
async function runPersistNow(opts = {}) {
  invokeBeforeSaveHook();
  // Snapshot at start of the actual run (not when a coalesced call was queued).
  const snapshot = snapshotForPersist(opts);
  const source = opts.source || 'ui';

  /** @type {Promise<{ ok: boolean, error?: string } & Record<string, unknown>>} */
  let promise;

  if (canExecuteClinicalCommand()) {
    promise = executeClinicalCommand(
      { type: 'clinical.persistSnapshot', ...snapshot },
      { source, echoSnapshot: false }
    ).then((res) => {
      if (!res || res.ok === false) {
        return { ok: false, error: String(res?.error || 'persist_failed') };
      }
      return { ok: true, ...res };
    });
  } else {
    // Web / no IPC: keep read model in sync. Prefer not writing CLINICAL_LS_KEYS
    // when session-scoped web client (in-memory path).
    _applyRepoSnapshot(snapshot, { source: 'persist-memory' });
    if (isWebClinicalClient()) {
      promise = Promise.resolve({ ok: true, memoryOnly: true });
    } else {
      promise = Promise.resolve(legacySaveAll(snapshot)).then((result) => {
        if (result && result.ok === false) {
          return { ok: false, error: String(result.error || 'save_failed'), ...result };
        }
        return { ok: true, ...(result && typeof result === 'object' ? result : {}) };
      });
    }
  }

  _persistInFlight = promise;
  try {
    const result = await promise;
    notifySaveResultHook(result);
    invokeAfterSaveHook();
    return result;
  } finally {
    if (_persistInFlight === promise) _persistInFlight = null;
  }
}

/**
 * Queue at most one follow-up that re-snapshots when the in-flight persist finishes.
 * @param {{ immediate?: boolean, source?: string }} [opts]
 */
function enqueueCoalescedFollowUp(opts = {}) {
  _flushQueued = true;
  if (!_coalesceTail) {
    const inFlight = _persistInFlight;
    _coalesceTail = Promise.resolve(inFlight).then(async () => {
      _coalesceTail = null;
      if (!_flushQueued) return { ok: true };
      _flushQueued = false;
      return runPersistNow({ ...opts, immediate: true });
    });
  }
  return _coalesceTail;
}

/**
 * Persist current clinical domains.
 *
 * @param {{ immediate?: boolean, source?: string, domains?: string[] }} [opts]
 * @returns {Promise<{ ok: boolean, error?: string } & Record<string, unknown>>}
 */
export function persistClinicalState(opts = {}) {
  const immediate = !!(opts && opts.immediate);

  if (_persistTimer) {
    clearTimeout(_persistTimer);
    _persistTimer = null;
  }

  if (immediate) {
    const run = _persistInFlight
      ? enqueueCoalescedFollowUp(opts)
      : runPersistNow(opts);
    resolveDebounceWaiters(run);
    return run;
  }

  return new Promise((resolve) => {
    _debounceResolvers.push(resolve);
    _persistTimer = setTimeout(() => {
      _persistTimer = null;
      const run = _persistInFlight
        ? enqueueCoalescedFollowUp(opts)
        : runPersistNow(opts);
      resolveDebounceWaiters(run);
    }, PERSIST_DEBOUNCE_MS);
  });
}

/**
 * Persist immediately; clears debounce and coalesces with any in-flight persist.
 * @returns {Promise<{ ok: boolean, error?: string } & Record<string, unknown>>}
 */
export async function flushPersistClinicalState() {
  clearPersistTimer();
  const run = _persistInFlight
    ? enqueueCoalescedFollowUp({ immediate: true, source: 'flush' })
    : runPersistNow({ immediate: true, source: 'flush' });
  resolveDebounceWaiters(run);
  return run;
}

/**
 * Full snapshot persist on idle so census apply does not clone labHistory
 * on the first click after patients load (~1s INP).
 */
export function scheduleIdleClinicalPersist() {
  if (_idleFullPersistQueued) return;
  _idleFullPersistQueued = true;
  scheduleIdle(function () {
    _idleFullPersistQueued = false;
    persistClinicalState();
  }, IDLE_FULL_PERSIST_MS);
}

/** @internal */
export function resetPersistClinicalStateForTests() {
  clearPersistTimer();
  _persistInFlight = null;
  _coalesceTail = null;
  _flushQueued = false;
  _debounceResolvers = [];
  _idleFullPersistQueued = false;
}
