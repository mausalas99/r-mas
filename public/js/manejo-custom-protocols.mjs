/** Protocolos SOME personalizados y overrides de plantillas (localStorage). */

var STORAGE_KEY = 'rpc-manejo-custom-protocols';
var OVERRIDES_KEY = 'rpc-manejo-protocol-overrides';

function safeParseArray(raw) {
  try {
    var parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

export function loadCustomProtocols() {
  try {
    return safeParseArray(localStorage.getItem(STORAGE_KEY));
  } catch (_e2) {
    return [];
  }
}

/** @param {object[]} entries */
export function saveCustomProtocols(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries || []));
  } catch (_e3) {}
}

/** @param {object} entry */
export function addCustomProtocol(entry) {
  var list = loadCustomProtocols();
  var id = 'custom-' + Date.now();
  list.push({
    id: id,
    category: entry.category || 'otros',
    title: entry.title || 'Protocolo personalizado',
    indicationText: entry.indicationText || '',
    calculatorId: null,
    copyTemplate: entry.copyTemplate || entry.indicationText || '',
    notes: entry.notes || [],
    isCustom: true,
  });
  saveCustomProtocols(list);
  return id;
}

/** @param {string} id @param {object} patch */
export function updateCustomProtocol(id, patch) {
  var list = loadCustomProtocols();
  var idx = list.findIndex(function (p) {
    return p.id === id;
  });
  if (idx < 0) return false;
  list[idx] = Object.assign({}, list[idx], patch, { id: id, isCustom: true });
  saveCustomProtocols(list);
  return true;
}

export function deleteCustomProtocol(id) {
  var list = loadCustomProtocols().filter(function (p) {
    return p.id !== id;
  });
  saveCustomProtocols(list);
}

function safeParseObject(raw) {
  try {
    var parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_e4) {
    return {};
  }
}

export function loadProtocolOverrides() {
  try {
    return safeParseObject(localStorage.getItem(OVERRIDES_KEY));
  } catch (_e5) {
    return {};
  }
}

/** @param {string} id @param {object} patch */
export function saveProtocolOverride(id, patch) {
  if (!id) return;
  var all = loadProtocolOverrides();
  all[id] = Object.assign({}, all[id] || {}, patch, { id: id });
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
  } catch (_e6) {}
}

export function removeProtocolOverride(id) {
  if (!id) return;
  var all = loadProtocolOverrides();
  delete all[id];
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
  } catch (_e7) {}
}

/** @param {object} entry */
export function applyEntryOverrides(entry) {
  if (!entry || entry.isCustom) return entry;
  var o = loadProtocolOverrides()[entry.id];
  if (!o) return entry;
  return Object.assign({}, entry, o);
}

export function hasProtocolOverride(id) {
  return !!loadProtocolOverrides()[id];
}
