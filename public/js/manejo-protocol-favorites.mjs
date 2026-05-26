/** Favoritos y recientes de protocolos Manejo (localStorage). */

var FAV_KEY = 'rpc-manejo-protocol-favorites';
var RECENT_KEY = 'rpc-manejo-protocol-recent';
var RECENT_MAX = 12;

/** @type {Set<string>|null} */
var favoritesCache = null;

function safeParseArray(raw) {
  try {
    var parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

function getFavoritesSet() {
  if (favoritesCache) return favoritesCache;
  favoritesCache = new Set(loadProtoFavoritesFromStorage());
  return favoritesCache;
}

function loadProtoFavoritesFromStorage() {
  try {
    return safeParseArray(localStorage.getItem(FAV_KEY));
  } catch (_e2) {
    return [];
  }
}

export function loadProtoFavorites() {
  return Array.from(getFavoritesSet());
}

function saveProtoFavorites(ids) {
  favoritesCache = new Set(ids || []);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favoritesCache)));
  } catch (_e3) {}
}

export function isProtoFavorite(id) {
  if (!id) return false;
  return getFavoritesSet().has(id);
}

/** @returns {boolean} now favorited */
export function toggleProtoFavorite(id) {
  if (!id) return false;
  var set = getFavoritesSet();
  if (set.has(id)) {
    set.delete(id);
    saveProtoFavorites(Array.from(set));
    return false;
  }
  var list = [id].concat(Array.from(set));
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
