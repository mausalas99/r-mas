const GUARDIA_SALA_LS_KEY = 'guardia.sala';
const GUARDIA_SALA_VALID_MS = 24 * 60 * 60 * 1000;

let _appShellInstalled = false;
let _guardiaViewBootstrapped = false;
let _elevatedFullWardPullScheduled = false;
let _guardiaInitialLoadDone = false;

export function isAppShellInstalled() {
  return _appShellInstalled;
}

export function markAppShellInstalled() {
  _appShellInstalled = true;
}

export function isGuardiaViewBootstrapped() {
  return _guardiaViewBootstrapped;
}

export function setGuardiaViewBootstrapped(value) {
  _guardiaViewBootstrapped = !!value;
}

/** True once the first guardia bootstrap (DB census + missing-patient pull) has resolved. */
export function isGuardiaInitialLoadDone() {
  return _guardiaInitialLoadDone;
}

export function markGuardiaInitialLoadDone() {
  _guardiaInitialLoadDone = true;
}

export function isElevatedFullWardPullScheduled() {
  return _elevatedFullWardPullScheduled;
}

export function markElevatedFullWardPullScheduled() {
  _elevatedFullWardPullScheduled = true;
}

/**
 * Sala declared for tonight's guardia — valid 24h from when it was set.
 * @param {Storage|undefined} [storage]
 * @returns {string}
 */
export function readGuardiaSala(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(GUARDIA_SALA_LS_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    const sala = String(parsed?.sala || '').trim();
    const at = new Date(parsed?.at || 0).getTime();
    if (!sala || !Number.isFinite(at)) return '';
    if (Date.now() - at > GUARDIA_SALA_VALID_MS) return '';
    return sala;
  } catch (_e) {
    return '';
  }
}

/**
 * @param {string} sala
 * @param {Storage|undefined} [storage]
 */
export function writeGuardiaSala(sala, storage = globalThis.localStorage) {
  try {
    storage?.setItem(
      GUARDIA_SALA_LS_KEY,
      JSON.stringify({ sala: String(sala || '').trim(), at: new Date().toISOString() })
    );
  } catch (_e) {
    void _e;
  }
}

/** @param {Storage|undefined} [storage] */
export function clearGuardiaSala(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(GUARDIA_SALA_LS_KEY);
  } catch (_e) {
    void _e;
  }
}
