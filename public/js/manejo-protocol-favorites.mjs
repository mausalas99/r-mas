/** Favoritos y recientes de protocolos Manejo (localStorage). */

var FAV_KEY = 'rpc-manejo-protocol-favorites';
var RECENT_KEY = 'rpc-manejo-protocol-recent';
var RECENT_MAX = 12;

function safeParseArray(raw) {
  try {
    var parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

export function loadProtoFavorites() {
  try {
    return safeParseArray(localStorage.getItem(FAV_KEY));
  } catch (_e2) {
    return [];
  }
}

function saveProtoFavorites(ids) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids || []));
  } catch (_e3) {}
}

export function isProtoFavorite(id) {
  if (!id) return false;
  return loadProtoFavorites().indexOf(id) >= 0;
}

/** @returns {boolean} now favorited */
export function toggleProtoFavorite(id) {
  if (!id) return false;
  var list = loadProtoFavorites();
  var idx = list.indexOf(id);
  if (idx >= 0) {
    list.splice(idx, 1);
    saveProtoFavorites(list);
    return false;
  }
  list.unshift(id);
  saveProtoFavorites(list);
  return true;
}

export function loadProtoRecentIds() {
  try {
    return safeParseArray(localStorage.getItem(RECENT_KEY));
  } catch (_e4) {
    return [];
  }
}

function saveProtoRecentIds(ids) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids || []));
  } catch (_e5) {}
}

export function recordProtoRecent(id) {
  if (!id) return;
  var list = loadProtoRecentIds().filter(function (x) {
    return x !== id;
  });
  list.unshift(id);
  if (list.length > RECENT_MAX) list.length = RECENT_MAX;
  saveProtoRecentIds(list);
}
