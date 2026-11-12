/**
 * Sidebar patient list: what to draw, as plain data (no DOM, no Preact).
 * patients-list.mjs gathers the live inputs (patients, scope, filters, bulk mode…) and asks this
 * module for a state; patients-list-view.jsx draws it. A state keeps the SAME card object for a
 * card that did not change, so the view can skip it (memo on identity) and a one-card edit
 * redraws one card.
 */
import { comparePatientsByBed } from '../../../lib/patient-bed-sort.mjs';
import { sidebarNameDisplay, formatPatientBedParts } from '../patient-sidebar-card.mjs';

export const PATIENT_ACTIVE_VIRTUAL_THRESHOLD = 30;
// Real rendered card height (~61px at default density, one-line name) + the flex-column
// gap between cards (7px) — measured from a live sidebar. Absolutely
// positioned virtual items get no automatic gap, so a stride shorter than
// the real card height makes consecutive cards overlap and cut off text.
export const PATIENT_ACTIVE_ITEM_STRIDE = 68;
export const PATIENT_ACTIVE_OVERSCAN = 3;

/** @param {number} activeCount */
export function shouldVirtualizeActiveZone(activeCount) {
  return activeCount > PATIENT_ACTIVE_VIRTUAL_THRESHOLD;
}

/** @param {object[]} rows */
function sortZoneByBed(rows) {
  return rows.slice().sort(comparePatientsByBed);
}

/**
 * @param {object[]} filtered
 * @param {{ sortByBed?: boolean }|undefined} [options]
 */
export function buildPatientListZones(filtered, options) {
  const opts = options && typeof options === 'object' ? options : {};
  const zones = {
    pinned: filtered.filter((p) => p.pinned && !p.archived),
    active: filtered.filter((p) => !p.pinned && !p.archived),
    archived: filtered.filter((p) => !!p.archived),
  };
  if (opts.sortByBed) {
    zones.pinned = sortZoneByBed(zones.pinned);
    zones.active = sortZoneByBed(zones.active);
    zones.archived = sortZoneByBed(zones.archived);
  }
  return zones;
}

/** Card ids in on-screen order (↑ / ↓ walk): pinned, active, archived. */
export function buildRondaNavIds(zones) {
  const out = [];
  zones.pinned.forEach((p) => out.push(String(p.id)));
  zones.active.forEach((p) => out.push(String(p.id)));
  zones.archived.forEach((p) => out.push(String(p.id)));
  return out;
}

/**
 * Put `patients` (in place) in the order of `ids`; patients not listed keep their relative order after them.
 * @param {{ id: string }[]} patients @param {string[]} ids
 */
export function reorderPatientsByIds(patients, ids) {
  if (!ids || !ids.length) return patients;
  const rank = Object.create(null);
  ids.forEach((id, i) => { rank[id] = i; });
  const missingBase = ids.length + 1000;
  patients.sort((a, b) => {
    const ra = Object.prototype.hasOwnProperty.call(rank, a.id) ? rank[a.id] : missingBase;
    const rb = Object.prototype.hasOwnProperty.call(rank, b.id) ? rank[b.id] : missingBase;
    return ra - rb;
  });
  return patients;
}

/**
 * @typedef {object} CardEnv what the page knows about the world, resolved by the caller
 * @property {string|null} activeId
 * @property {boolean} bulkMode
 * @property {(id: string) => boolean} isBulkSelected
 * @property {boolean} showServicio  settings are not in «sala» mode
 * @property {boolean} showPin       interconsulta mode hides the pin button
 * @property {boolean} mobile        phone web: bed labels drop «Cto.» / «Cama»
 * @property {(id: string) => boolean} canDelete
 * @property {(p: object) => boolean} isIncomplete
 * @property {(p: object) => number|null} svcHue
 * @property {(p: object) => string} requestingService
 */

/**
 * One card as data. `key` is every field that changes the markup, so equal keys mean an identical card.
 * @param {object} p @param {CardEnv} env
 */
export function buildCardModel(p, env) {
  const pinOn = !!p.pinned;
  const archOn = !!p.archived;
  const bulkOn = env.bulkMode && env.isBulkSelected(p.id);
  const svcHue = env.svcHue(p);
  const nombreRaw = String(p.nombre || '').trim();
  const registro = String(p.registro || '').trim();
  const nombreDisplay = sidebarNameDisplay(nombreRaw, registro);
  const servicio = env.showServicio ? String(env.requestingService(p) || p.servicio || '').trim() : '';
  const titleParts = [nombreRaw !== nombreDisplay ? nombreRaw : '', registro, servicio].filter(Boolean);
  const { cuarto, cama } = formatPatientBedParts(p);
  const bed = [];
  if (cuarto) bed.push((env.mobile ? '' : 'Cto. ') + cuarto);
  if (cama) bed.push((env.mobile ? '' : 'Cama ') + cama);
  const card = {
    id: p.id,
    active: p.id === env.activeId,
    incomplete: !!env.isIncomplete(p),
    svcHue,
    bulk: !!env.bulkMode,
    bulkOn: !!bulkOn,
    pinOn,
    archOn,
    showPin: !!env.showPin,
    canDelete: !env.bulkMode && !!env.canDelete(p.id),
    title: titleParts.join(' · '),
    name: nombreDisplay,
    openLabel: nombreRaw || nombreDisplay,
    bed,
    svc: servicio,
  };
  card.key = JSON.stringify(card);
  return card;
}

/** @param {object[]} rows @param {CardEnv} env @param {Map<string, object>} prev */
function cardsFor(rows, env, prev) {
  return rows.map((p) => {
    const next = buildCardModel(p, env);
    const old = prev.get(String(p.id));
    return old && old.key === next.key ? old : next;
  });
}

export const emptyPatientListState = () => ({
  kind: 'empty',
  message: '',
  tone: 'muted',
  pinned: [],
  active: [],
  archived: [],
  archivedCollapsed: false,
  virtual: false,
  win: { scrollTop: 0, height: 0 },
});

/** Grey text instead of the list. `tone: 'slate'` is the lighter «Sincronizando equipo…» text. */
export function messagePatientListState(prev, message, tone) {
  return { ...emptyPatientListState(), win: prev.win, kind: 'message', message, tone: tone || 'muted' };
}

/**
 * The list state for these zones. Cards that did not change keep their object from `prev`.
 * @param {{ kind: string, pinned: object[], active: object[], archived: object[], win: object }} prev
 * @param {{ pinned: object[], active: object[], archived: object[] }} zones
 * @param {CardEnv} env @param {boolean} archivedCollapsed
 */
export function nextPatientListState(prev, zones, env, archivedCollapsed) {
  const old = new Map();
  [prev.pinned, prev.active, prev.archived].forEach((cards) => cards.forEach((c) => old.set(String(c.id), c)));
  return {
    kind: 'cards',
    message: '',
    tone: 'muted',
    pinned: cardsFor(zones.pinned, env, old),
    active: cardsFor(zones.active, env, old),
    archived: cardsFor(zones.archived, env, old),
    archivedCollapsed: !!archivedCollapsed,
    virtual: shouldVirtualizeActiveZone(zones.active.length),
    win: prev.win,
  };
}

/** The same state with another patient marked open: only the card that lost it and the one that got it change. */
export function withActivePatient(state, nextId) {
  const mark = (c) => {
    const is = String(c.id) === String(nextId);
    if (c.active === is) return c;
    const next = { ...c, active: is };
    delete next.key;
    next.key = JSON.stringify(next);
    return next;
  };
  return { ...state, pinned: state.pinned.map(mark), active: state.active.map(mark), archived: state.archived.map(mark) };
}

/** The card's class attribute, exactly as the string builder wrote it (blank gaps included). */
export function cardClass(c) {
  return (
    'patient-card ' +
    (c.active ? 'active' : '') +
    (c.pinOn ? ' patient-card--pinned' : '') +
    (c.archOn ? ' patient-card--archived' : '') +
    (c.bulkOn ? ' patient-card--bulk-selected' : '') +
    (c.incomplete ? ' patient-card--incomplete' : '') +
    (c.svcHue != null ? ' patient-card--svc-tint' : '')
  );
}

/** Number of cards the state would draw (all of the active zone counts, drawn or not). */
export function patientListCardCount(state) {
  return state.pinned.length + state.active.length + (state.archivedCollapsed ? 0 : state.archived.length);
}
