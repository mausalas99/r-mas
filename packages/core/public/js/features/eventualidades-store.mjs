import { toClinicalHistoryText } from '../../../lib/clinical-text.mjs';

export function normalizeEventualidadText(text) {
  return toClinicalHistoryText(text).trim();
}

let rt = {
  getActiveId() {
    return null;
  },
  showToast(_msg, _type) {},
};

export function registerEventualidadesRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

export { rt };

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** @param {Date | string | number} [when] @returns {string} YYYY-MM-DD */
export function toEventualidadDateValue(when) {
  const d = when == null ? new Date() : when instanceof Date ? when : new Date(when);
  if (!Number.isFinite(d.getTime())) return '';
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/** @param {string} dateIso YYYY-MM-DD — almacena mediodía local para agrupar por día */
export function eventualidadDateToIso(dateIso) {
  const raw = String(dateIso || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return eventualidadDateToIso(toEventualidadDateValue(new Date()));
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(y, mo - 1, day, 12, 0, 0, 0);
  return Number.isFinite(dt.getTime()) ? dt.toISOString() : new Date().toISOString();
}

/** @param {unknown} deleted */
function cloneDeletedIds_(deleted) {
  if (!deleted || typeof deleted !== 'object') return null;
  /** @type {Record<string, string>} */
  const deletedIds = {};
  for (const key of Object.keys(deleted)) {
    const id = String(key || '').trim();
    if (!id) continue;
    deletedIds[id] = String(/** @type {Record<string, unknown>} */ (deleted)[id] || '');
  }
  return Object.keys(deletedIds).length ? deletedIds : null;
}

function cloneStoreShell_(store) {
  const entries = Array.isArray(store && store.entries) ? store.entries.slice() : [];
  const labsText =
    store && store.labsText != null ? normalizeEventualidadText(store.labsText) : '';
  /** @type {{ entries: object[], labsText: string, deletedIds?: Record<string, string>, updatedAt?: string }} */
  const next = { entries: entries, labsText: labsText };
  const deletedIds = cloneDeletedIds_(store && store.deletedIds);
  if (deletedIds) next.deletedIds = deletedIds;
  if (store && store.updatedAt) next.updatedAt = String(store.updatedAt);
  return next;
}

/** @param {{ updatedAt?: string, deletedIds?: Record<string, string> }} store */
function touchEventualidadesMeta_(store) {
  store.updatedAt = new Date().toISOString();
  return store;
}

/** @param {unknown} store @returns {string} */
export function getEventualidadesLabsText(store) {
  if (!store || typeof store !== 'object') return '';
  return normalizeEventualidadText(/** @type {{ labsText?: unknown }} */ (store).labsText);
}

/**
 * Reemplaza el bloque de interpretación de labs (mismo registro eventualidades).
 * @param {{ entries?: object[], labsText?: string }|null|undefined} store
 * @param {string} text
 */
export function setEventualidadesLabsText(store, text) {
  const next = cloneStoreShell_(store);
  next.labsText = normalizeEventualidadText(text);
  return touchEventualidadesMeta_(next);
}

/**
 * Fusiona texto de labs si aún no está contenido (autosend parcial).
 * @param {{ entries?: object[], labsText?: string }|null|undefined} store
 * @param {string} text
 * @returns {{ entries: object[], labsText: string, changed: boolean }}
 */
/** @typedef {'transfusion'|'biopsia'|'procedimiento'|'otro'} EventualidadKind */

export const EVENTUALIDAD_KINDS = ['transfusion', 'biopsia', 'procedimiento', 'otro'];

export const EVENTUALIDAD_KIND_LABELS = {
  transfusion: 'Transfusión',
  biopsia: 'Biopsia',
  procedimiento: 'Procedimiento',
  otro: 'Otro',
};

/** @typedef {'eritrocitos'|'plaquetas'|'plasma'|'aferesis'} TransfusionProduct */

export const TRANSFUSION_PRODUCTS = ['eritrocitos', 'plaquetas', 'plasma', 'aferesis'];

export const TRANSFUSION_PRODUCT_LABELS = {
  eritrocitos: 'Eritrocitos',
  plaquetas: 'Plaquetas',
  plasma: 'Plasma',
  aferesis: 'Aféresis plaquetaria',
};

export const TRANSFUSION_PRODUCT_ABBR = {
  eritrocitos: 'CE',
  plaquetas: 'Plaq',
  plasma: 'Plas',
  aferesis: 'AfP',
};

export const EVENTUALIDAD_KIND_ABBR = {
  transfusion: 'Transf',
  biopsia: 'Bx',
  procedimiento: 'Proc',
  otro: 'Ev',
};

/** @param {unknown} product @returns {TransfusionProduct|null} */
export function normalizeTransfusionProduct(product) {
  const p = String(product == null ? '' : product)
    .trim()
    .toLowerCase();
  return TRANSFUSION_PRODUCTS.includes(/** @type {TransfusionProduct} */ (p))
    ? /** @type {TransfusionProduct} */ (p)
    : null;
}

/**
 * Arma el texto guardado según categoría y subcampos del compose de Tendencias.
 * @param {{ kind?: unknown, transfusionProduct?: unknown, detail?: unknown }} fields
 * @returns {string}
 */
export function buildEventualidadComposeText(fields) {
  const kind = normalizeEventualidadKind(fields && fields.kind);
  const detail = normalizeEventualidadText(fields && fields.detail != null ? String(fields.detail) : '');
  const product = normalizeTransfusionProduct(fields && fields.transfusionProduct);
  if (kind === 'transfusion') {
    if (!product) return '';
    const base = normalizeEventualidadText(TRANSFUSION_PRODUCT_LABELS[product]);
    return detail ? base + ' — ' + detail : base;
  }
  if (kind === 'biopsia' || kind === 'procedimiento') return detail;
  return resolveEventualidadEntryText(detail, kind);
}

const EVENTUALIDAD_KIND_PRIORITY = {
  transfusion: 4,
  biopsia: 3,
  procedimiento: 2,
  otro: 1,
};

/** @param {unknown} kind @returns {EventualidadKind|null} */
export function normalizeEventualidadKind(kind) {
  const k = String(kind == null ? '' : kind)
    .trim()
    .toLowerCase();
  return EVENTUALIDAD_KINDS.includes(/** @type {EventualidadKind} */ (k))
    ? /** @type {EventualidadKind} */ (k)
    : null;
}

/** @param {string} text @returns {EventualidadKind} */
export function inferEventualidadKind(text) {
  const t = String(text || '').toUpperCase();
  if (/\bTRANSFUSI|TRANSFUSIÓN|\bPFC\b|PLAQUETAS|CONCENTRADO\s+DE\s+ERIT|CONCENTRADO\s+ERIT|\bCH\b/.test(t)) {
    return 'transfusion';
  }
  if (/\bBIOPSIA\b/.test(t)) return 'biopsia';
  if (
    /\bPROCEDIMIENTO\b|\bCIRUGÍA\b|\bCIRUGIA\b|\bCX\b|CATÉTER|CATETER|\bDRENAJE\b|\bLAVADO\b/.test(t)
  ) {
    return 'procedimiento';
  }
  return 'otro';
}

/** @param {{ kind?: unknown, text?: unknown }|null|undefined} entry @returns {EventualidadKind} */
export function resolveEventualidadKind(entry) {
  const explicit = normalizeEventualidadKind(entry && entry.kind);
  if (explicit) return explicit;
  return inferEventualidadKind(entry && entry.text != null ? String(entry.text) : '');
}

/** @param {EventualidadKind|string} a @param {EventualidadKind|string} b @returns {EventualidadKind} */
export function pickHigherPriorityKind(a, b) {
  const ka = normalizeEventualidadKind(a) || 'otro';
  const kb = normalizeEventualidadKind(b) || 'otro';
  return (EVENTUALIDAD_KIND_PRIORITY[ka] || 1) >= (EVENTUALIDAD_KIND_PRIORITY[kb] || 1) ? ka : kb;
}

/**
 * Free-text detail typed by the user for an entry, with the auto-added
 * "<Producto> — " transfusion prefix stripped back off.
 * @param {{ kind?: unknown, text?: unknown, transfusionProduct?: unknown }|null|undefined} entry
 * @returns {string}
 */
export function deriveEventualidadDetail(entry) {
  const kind = resolveEventualidadKind(entry);
  const text = String((entry && entry.text) || '');
  if (kind !== 'transfusion') return text;
  const product = normalizeTransfusionProduct(entry && entry.transfusionProduct);
  const prefix = product ? normalizeEventualidadText(TRANSFUSION_PRODUCT_LABELS[product]) + ' — ' : '';
  return prefix && text.indexOf(prefix) === 0 ? text.slice(prefix.length) : '';
}

/** @param {string} detail @returns {string} leading quantity, e.g. "6" from "6 U" */
function leadingQuantityFromDetail(detail) {
  const m = /^(\d+)/.exec(String(detail || '').trim());
  return m ? m[1] : '';
}

/**
 * Short chip text for an event marker/tag, e.g. "6 Plaq", "CE", "Bx".
 * @param {{ kind?: unknown, text?: unknown, transfusionProduct?: unknown }|null|undefined} entry
 * @returns {string}
 */
export function abbreviatedEventualidadLabel(entry) {
  const kind = resolveEventualidadKind(entry);
  if (kind === 'transfusion') {
    const product = normalizeTransfusionProduct(entry && entry.transfusionProduct);
    const abbr = product ? TRANSFUSION_PRODUCT_ABBR[product] : EVENTUALIDAD_KIND_ABBR.transfusion;
    const qty = leadingQuantityFromDetail(deriveEventualidadDetail(entry));
    return qty ? qty + ' ' + abbr : abbr;
  }
  return EVENTUALIDAD_KIND_ABBR[kind] || 'Ev';
}

export function mergeEventualidadesLabsText(store, text) {
  const next = cloneStoreShell_(store);
  const t = normalizeEventualidadText(text);
  if (!t) return Object.assign(next, { changed: false });
  const cur = next.labsText;
  if (cur === t || (cur && cur.indexOf(t) >= 0)) {
    return Object.assign(next, { changed: false });
  }
  next.labsText = cur ? cur + '\n\n' + t : t;
  touchEventualidadesMeta_(next);
  return Object.assign(next, { changed: true });
}

/** @param {string} text @param {unknown} [kind] @returns {string} */
export function resolveEventualidadEntryText(text, kind) {
  const normalized = normalizeEventualidadText(text);
  if (normalized) return normalized;
  const normalizedKind = normalizeEventualidadKind(kind);
  if (normalizedKind) return normalizeEventualidadText(EVENTUALIDAD_KIND_LABELS[normalizedKind]);
  return '';
}

export function appendEventualidad(store, text, clientId, atIso, kind, transfusionProduct, entryId) {
  const normalizedKind = normalizeEventualidadKind(kind);
  const normalizedProduct = normalizeTransfusionProduct(transfusionProduct);
  const t = resolveEventualidadEntryText(text, kind);
  const base = cloneStoreShell_(store);
  if (!t) return base;
  const at =
    atIso && String(atIso).trim()
      ? String(atIso).trim()
      : eventualidadDateToIso(toEventualidadDateValue(new Date()));
  const stableId = entryId != null ? String(entryId).trim() : '';
  /** @type {{ id: string, at: string, text: string, clientId?: string, kind?: EventualidadKind, transfusionProduct?: TransfusionProduct }} */
  const entry = {
    id: stableId || 'ev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    at: at,
    text: t,
    clientId: clientId || undefined,
  };
  if (normalizedKind) entry.kind = normalizedKind;
  if (normalizedKind === 'transfusion' && normalizedProduct) entry.transfusionProduct = normalizedProduct;
  base.entries.push(entry);
  if (base.deletedIds && base.deletedIds[entry.id]) delete base.deletedIds[entry.id];
  return touchEventualidadesMeta_(base);
}

function resolveUpdateEventualidadKind_(patch, cur) {
  return patch && patch.kind != null ? normalizeEventualidadKind(patch.kind) : normalizeEventualidadKind(cur.kind);
}

function resolveUpdateEventualidadText_(patch, cur, patchKind) {
  return patch && patch.text != null
    ? resolveEventualidadEntryText(patch.text, patchKind || cur.kind)
    : resolveEventualidadEntryText(cur.text, patchKind || cur.kind);
}

function resolveUpdateEventualidadAt_(patch, cur) {
  return patch && patch.at != null && String(patch.at).trim() ? String(patch.at).trim() : cur.at;
}

function applyUpdateEventualidadPatchExtras_(nextEntry, patch) {
  if (patch && patch.kind != null) {
    const normalizedKind = normalizeEventualidadKind(patch.kind);
    if (normalizedKind) nextEntry.kind = normalizedKind;
    else delete nextEntry.kind;
  }
  if (patch && patch.transfusionProduct != null) {
    const normalizedProduct = normalizeTransfusionProduct(patch.transfusionProduct);
    if (normalizedProduct) nextEntry.transfusionProduct = normalizedProduct;
    else delete nextEntry.transfusionProduct;
  } else if (nextEntry.kind !== 'transfusion') {
    delete nextEntry.transfusionProduct;
  }
}

export function updateEventualidad(store, entryId, patch) {
  const id = String(entryId || '').trim();
  const base = cloneStoreShell_(store);
  if (!id) return base;
  const idx = base.entries.findIndex(function (e) {
    return e && String(e.id) === id;
  });
  if (idx === -1) return base;
  const cur = base.entries[idx];
  const patchKind = resolveUpdateEventualidadKind_(patch, cur);
  const text = resolveUpdateEventualidadText_(patch, cur, patchKind);
  if (!text) return base;
  const at = resolveUpdateEventualidadAt_(patch, cur);
  /** @type {{ text: string, at: string, kind?: EventualidadKind, transfusionProduct?: TransfusionProduct }} */
  const nextEntry = Object.assign({}, cur, { text: text, at: at });
  applyUpdateEventualidadPatchExtras_(nextEntry, patch);
  base.entries[idx] = nextEntry;
  return touchEventualidadesMeta_(base);
}

export function findEventualidadEntry(store, entryId) {
  const id = String(entryId || '').trim();
  if (!id) return null;
  return (
    (Array.isArray(store && store.entries) ? store.entries : []).find(function (e) {
      return e && String(e.id) === id;
    }) || null
  );
}

export function removeEventualidad(store, entryId) {
  const id = String(entryId || '').trim();
  const base = cloneStoreShell_(store);
  if (!id) return base;
  base.entries = base.entries.filter(function (e) {
    return e && String(e.id) !== id;
  });
  if (!base.deletedIds) base.deletedIds = {};
  base.deletedIds[id] = new Date().toISOString();
  return touchEventualidadesMeta_(base);
}

export function sortEntriesDesc(entries) {
  return (entries || [])
    .slice()
    .sort(function (a, b) {
      return String(b.at || '').localeCompare(String(a.at || ''));
    });
}

/** Local calendar day key (YYYY-MM-DD) for grouping. */
export function dayKeyFromIso(iso) {
  if (!iso) return 'unknown';
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return 'unknown';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  } catch {
    return 'unknown';
  }
}

export function formatDayLabel(dayKey, now) {
  if (dayKey === 'unknown') return 'Sin fecha';
  const parts = String(dayKey).split('-').map(Number);
  if (parts.length !== 3 || parts.some(function (n) {
    return !Number.isFinite(n);
  })) {
    return String(dayKey);
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (!Number.isFinite(date.getTime())) return String(dayKey);
  const ref = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const todayKey = dayKeyFromIso(ref.toISOString());
  const yesterday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1);
  const yesterdayKey = dayKeyFromIso(yesterday.toISOString());
  if (dayKey === todayKey) return 'Hoy';
  if (dayKey === yesterdayKey) return 'Ayer';
  return date.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Fecha calendario cuando la etiqueta principal es relativa (Hoy / Ayer). */
export function formatDaySubLabel(dayKey, now) {
  if (dayKey === 'unknown') return '';
  const parts = String(dayKey).split('-').map(Number);
  if (parts.length !== 3 || parts.some(function (n) {
    return !Number.isFinite(n);
  })) {
    return '';
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (!Number.isFinite(date.getTime())) return '';
  const ref = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const todayKey = dayKeyFromIso(ref.toISOString());
  const yesterday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1);
  const yesterdayKey = dayKeyFromIso(yesterday.toISOString());
  if (dayKey !== todayKey && dayKey !== yesterdayKey) return '';
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

/** Newest day first; within each day, newest entry first. */
export function groupEntriesByDay(entries, now) {
  const map = new Map();
  (entries || []).forEach(function (e) {
    const key = dayKeyFromIso(e && e.at);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  });
  return [...map.entries()]
    .sort(function (a, b) {
      return String(b[0]).localeCompare(String(a[0]));
    })
    .map(function (pair) {
      const day = pair[0];
      const dayEntries = pair[1]
        .slice()
        .sort(function (a, b) {
          const byAt = String(b.at || '').localeCompare(String(a.at || ''));
          if (byAt !== 0) return byAt;
          return String(b.id || '').localeCompare(String(a.id || ''));
        });
      return {
        day: day,
        label: formatDayLabel(day, now),
        isToday: day === dayKeyFromIso((now || new Date()).toISOString()),
        entries: dayEntries,
      };
    });
}

