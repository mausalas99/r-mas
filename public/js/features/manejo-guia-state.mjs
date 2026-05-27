export const GUIA_MODES = ['patologia', 'infusion', 'atb'];

var KEYS = {
  mode: 'manejoGuia.mode',
  view: 'manejoGuia.view',
  entityId: 'manejoGuia.entityId',
  fromPathologyId: 'manejoGuia.fromPathologyId',
  legacySubtab: 'manejoSubtab',
  legacyProto: 'manejoProtoSelectedId',
  legacyPathology: 'manejoPathologySelected',
};

/** In-memory fallback when sessionStorage unavailable (tests). */
var _mem = Object.create(null);

function read(key) {
  try {
    return sessionStorage.getItem(key);
  } catch (_e) {
    return _mem[key] != null ? String(_mem[key]) : null;
  }
}

function write(key, val) {
  try {
    if (val == null || val === '') sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(val));
  } catch (_e2) {
    if (val == null || val === '') delete _mem[key];
    else _mem[key] = String(val);
  }
}

export function resetGuiaStateForTests() {
  Object.keys(KEYS).forEach(function (k) {
    write(KEYS[k], null);
  });
  _mem = Object.create(null);
}

export function migrateLegacyManejoSubtab(legacyId) {
  if (legacyId === 'patologias' || legacyId === 'cad-ehh') return 'patologia';
  if (legacyId === 'infusiones' || legacyId === 'protocolos') return 'infusion';
  if (legacyId === 'atb') return 'atb';
  return null;
}

export function getGuiaMode() {
  var m = read(KEYS.mode);
  return GUIA_MODES.indexOf(m) >= 0 ? m : 'patologia';
}

export function setGuiaMode(mode) {
  if (GUIA_MODES.indexOf(mode) < 0) return;
  if (getGuiaMode() !== mode && getGuiaView() === 'lectura') {
    setGuiaView('indice');
    setGuiaEntityId('');
  }
  write(KEYS.mode, mode);
}

export function getGuiaView() {
  var v = read(KEYS.view);
  return v === 'lectura' ? 'lectura' : 'indice';
}

export function setGuiaView(view) {
  write(KEYS.view, view === 'lectura' ? 'lectura' : 'indice');
}

export function getGuiaEntityId() {
  return read(KEYS.entityId) || '';
}

export function setGuiaEntityId(id) {
  write(KEYS.entityId, id || '');
}

export function getGuiaFromPathologyId() {
  return read(KEYS.fromPathologyId) || '';
}

export function setGuiaFromPathologyId(id) {
  write(KEYS.fromPathologyId, id || '');
}

/** @param {{ mode?: string, view?: string, entityId?: string, fromPathologyId?: string }} patch */
export function navigateGuia(patch) {
  patch = patch || {};
  if (patch.mode) setGuiaMode(patch.mode);
  if (patch.view) setGuiaView(patch.view);
  if (patch.entityId != null) setGuiaEntityId(patch.entityId);
  if (patch.fromPathologyId != null) setGuiaFromPathologyId(patch.fromPathologyId);
}

/** Call once when opening guía tab after legacy subtab stored. */
export function hydrateGuiaFromLegacySession() {
  var legacy = read(KEYS.legacySubtab);
  var mode = migrateLegacyManejoSubtab(legacy);
  if (!mode) return;
  navigateGuia({ mode: mode, view: 'indice' });
  var proto = read(KEYS.legacyProto);
  var path = read(KEYS.legacyPathology);
  if (mode === 'patologia' && path) {
    navigateGuia({ view: 'lectura', entityId: path });
  } else if (mode === 'infusion' && proto) {
    navigateGuia({ view: 'lectura', entityId: proto });
  } else if (mode === 'atb') {
    try {
      var atbId = read('manejoAtbSelectedId');
      if (atbId) navigateGuia({ view: 'lectura', entityId: atbId });
    } catch (_e3) {}
  }
}

/** Normalize manejoSubtab patologias|infusiones|atb → guia (call when rendering Guía). */
export function ensureManejoSubtabMigrated() {
  var legacy = read(KEYS.legacySubtab);
  var mode = migrateLegacyManejoSubtab(legacy);
  if (!mode) return;
  hydrateGuiaFromLegacySession();
  write(KEYS.legacySubtab, 'guia');
}
