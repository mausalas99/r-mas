/** Datos de Manejo compartidos por sala (protocolos custom, overrides, favoritos). */

import { compareIso } from './live-sync-room.mjs';
import { loadCustomProtocols, saveCustomProtocols, loadProtocolOverrides } from './manejo-custom-protocols.mjs';
import { loadProtoFavorites, loadProtoRecentIds } from './manejo-protocol-favorites.mjs';

const FAV_KEY = 'rpc-manejo-protocol-favorites';
const RECENT_KEY = 'rpc-manejo-protocol-recent';
const OVERRIDES_KEY = 'rpc-manejo-protocol-overrides';

function cloneManejoBlock(block) {
  if (!block || typeof block !== 'object') return null;
  return {
    customProtocols: Array.isArray(block.customProtocols) ? block.customProtocols.map((p) => ({ ...p })) : [],
    overrides:
      block.overrides && typeof block.overrides === 'object' ? { ...block.overrides } : {},
    favorites: Array.isArray(block.favorites) ? block.favorites.slice() : [],
    recent: Array.isArray(block.recent) ? block.recent.slice() : [],
    updatedAt: String(block.updatedAt || ''),
  };
}

/** @returns {object|null} */
export function collectManejoRoomPayload() {
  return {
    customProtocols: loadCustomProtocols(),
    overrides: loadProtocolOverrides(),
    favorites: loadProtoFavorites(),
    recent: loadProtoRecentIds(),
    updatedAt: new Date().toISOString(),
  };
}

function protocolUpdatedAt(p) {
  return String((p && p.updatedAt) || '');
}

function mergeProtocolLists(aList, bList) {
  const map = new Map();
  for (const arr of [aList, bList]) {
    for (const p of arr || []) {
      if (!p || !p.id) continue;
      const id = String(p.id);
      const cur = map.get(id);
      if (!cur || compareIso(protocolUpdatedAt(p), protocolUpdatedAt(cur)) >= 0) {
        map.set(id, { ...p });
      }
    }
  }
  return Array.from(map.values());
}

function mergeOverrides(a, b) {
  const out = {};
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const av = a && a[k];
    const bv = b && b[k];
    if (!av) {
      out[k] = bv ? { ...bv } : undefined;
      continue;
    }
    if (!bv) {
      out[k] = { ...av };
      continue;
    }
    const at = String(av.updatedAt || '');
    const bt = String(bv.updatedAt || '');
    out[k] = compareIso(bt, at) >= 0 ? { ...bv } : { ...av };
  }
  return out;
}

function mergeIdLists(aList, bList) {
  const seen = new Set();
  const out = [];
  for (const arr of [aList, bList]) {
    for (const id of arr || []) {
      const s = String(id || '').trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

/** @param {object|null|undefined} a @param {object|null|undefined} b */
export function mergeManejoRoomData(a, b) {
  if (!a && !b) return null;
  if (!a) return cloneManejoBlock(b);
  if (!b) return cloneManejoBlock(a);
  const ca = cloneManejoBlock(a);
  const cb = cloneManejoBlock(b);
  const at = ca.updatedAt;
  const bt = cb.updatedAt;
  const newerFirst = compareIso(bt, at) >= 0;
  const first = newerFirst ? cb : ca;
  const second = newerFirst ? ca : cb;
  return {
    customProtocols: mergeProtocolLists(first.customProtocols, second.customProtocols),
    overrides: mergeOverrides(first.overrides, second.overrides),
    favorites: mergeIdLists(first.favorites, second.favorites),
    recent: mergeIdLists(first.recent, second.recent),
    updatedAt: compareIso(bt, at) >= 0 ? bt : at,
  };
}

/** @param {object|null|undefined} merged */
export function applyManejoRoomDataToLocal(merged) {
  if (!merged || typeof merged !== 'object') return;
  if (Array.isArray(merged.customProtocols)) {
    saveCustomProtocols(merged.customProtocols);
  }
  if (merged.overrides && typeof merged.overrides === 'object') {
    try {
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(merged.overrides));
    } catch (_e) {}
  }
  if (Array.isArray(merged.favorites)) {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(merged.favorites));
    } catch (_e2) {}
  }
  if (Array.isArray(merged.recent)) {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(merged.recent));
    } catch (_e3) {}
  }
}

/** @param {Array<{ manejo?: object }>} sources */
export function mergeManejoFromSources(sources) {
  let merged = null;
  for (let i = 0; i < (sources || []).length; i += 1) {
    const src = sources[i];
    const block = src && src.manejo;
    if (!block) continue;
    merged = mergeManejoRoomData(merged, block);
  }
  return merged;
}
