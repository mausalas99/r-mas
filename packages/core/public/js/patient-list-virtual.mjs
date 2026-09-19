/**
 * Silent patch helpers when active zone uses virtual scroll.
 */

import { createVirtualScroll } from './virtual-scroll.mjs';
import {
  patientCardDisplayKey,
  syncSectionCounts,
  syncZoneCards,
  virtualPatientListStructureSignature,
  readVirtualPatientListStructure,
} from './patient-list-incremental.mjs';

export const PATIENT_ACTIVE_VIRTUAL_THRESHOLD = 30;
// Real rendered card height (89-90px at default density) + the flex-column
// gap between cards (~7-8px) — measured from a live sidebar. Absolutely
// positioned virtual items get no automatic gap, so a stride shorter than
// the real card height makes consecutive cards overlap and cut off text.
export const PATIENT_ACTIVE_ITEM_STRIDE = 98;

/** @param {number} activeCount */
export function shouldVirtualizeActiveZone(activeCount) {
  return activeCount > PATIENT_ACTIVE_VIRTUAL_THRESHOLD;
}

/** @param {string} html */
function htmlToElement(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  return wrap.firstElementChild;
}

/** @param {object} p @param {(p: object) => string} renderCardHtml @param {object} ctx */
function renderPatientCardElement(p, renderCardHtml, ctx) {
  const el = htmlToElement(renderCardHtml(p));
  if (!el) {
    const fallback = document.createElement('div');
    fallback.className = 'patient-card';
    fallback.dataset.patientId = String(p.id || '');
    return fallback;
  }
  el.setAttribute('data-display-key', patientCardDisplayKey(p, ctx));
  return el;
}

/** @type {{ instance: ReturnType<createVirtualScroll>|null, zoneEl: HTMLElement|null, listEl: HTMLElement|null, resizeObserver: ResizeObserver|null }} */
const state = {
  instance: null,
  zoneEl: null,
  listEl: null,
  resizeObserver: null,
};

/** @param {HTMLElement} listEl @param {HTMLElement} zoneEl */
function syncActiveZoneMaxHeight(listEl, zoneEl) {
  if (!listEl || !zoneEl) return;
  const listRect = listEl.getBoundingClientRect();
  const zoneRect = zoneEl.getBoundingClientRect();
  const bottomPad = 12;
  // Floor is ~5 cards tall (PATIENT_ACTIVE_ITEM_STRIDE * 5), not just "not zero":
  // when filters/pinned patients eat most of the visible sidebar, the remaining
  // room can be tiny, and clamping to that squeezes this box to 1-2 visible
  // cards. The outer #patient-list is already overflow-y:auto, so letting this
  // box run past the fold is fine — the outer scrollbar picks up the rest.
  const minH = PATIENT_ACTIVE_ITEM_STRIDE * 5;
  const maxH = Math.max(minH, Math.floor(listRect.bottom - zoneRect.top - bottomPad));
  // Sets `height` (not `max-height`): with flex-basis:auto + empty content on
  // first mount, an unset height reads back as 0px, so the virtual-scroll's
  // very first clientHeight read sees an empty box and renders nothing.
  // flex-shrink stays 0 (paired with min-height:0 below) so the flex layout
  // can't collapse this box back to 0 to make room for its siblings — the
  // parent list scrolls instead, which is the whole point of the CSS overflow:auto here.
  zoneEl.style.height = `${maxH}px`;
  zoneEl.style.flexShrink = '0';
}

function detachResizeObserver() {
  if (state.resizeObserver) {
    state.resizeObserver.disconnect();
    state.resizeObserver = null;
  }
}

export function destroyPatientActiveZoneVirtual() {
  detachResizeObserver();
  if (state.instance) {
    state.instance.destroy();
    state.instance = null;
  }
  if (state.zoneEl) {
    state.zoneEl.classList.remove('patient-sort-zone--virtual-active');
    state.zoneEl.style.removeProperty('overflow');
    state.zoneEl.style.removeProperty('height');
    state.zoneEl.style.removeProperty('min-height');
    state.zoneEl.style.removeProperty('flex-shrink');
    state.zoneEl.removeAttribute('data-active-ids');
    state.zoneEl = null;
  }
  state.listEl = null;
}

/**
 * @param {{ zoneEl: HTMLElement, listEl: HTMLElement, items: object[], renderCardHtml: (p: object) => string, ctx: object }} options
 */
export function mountPatientActiveZoneVirtual(options) {
  const { zoneEl, listEl, items, renderCardHtml, ctx } = options;
  if (!zoneEl || !listEl || !items.length) return null;

  zoneEl.classList.add('patient-sort-zone--virtual-active');
  zoneEl.style.overflow = 'auto';
  zoneEl.style.minHeight = '0';
  zoneEl.setAttribute(
    'data-active-ids',
    items.map((p) => String(p.id || '')).join(',')
  );
  syncActiveZoneMaxHeight(listEl, zoneEl);

  if (typeof ResizeObserver !== 'undefined') {
    detachResizeObserver();
    state.resizeObserver = new ResizeObserver(() => {
      syncActiveZoneMaxHeight(listEl, zoneEl);
    });
    state.resizeObserver.observe(listEl);
    state.resizeObserver.observe(zoneEl);
  }

  const renderItem = ({ item }) => renderPatientCardElement(item, renderCardHtml, ctx);

  if (state.instance && state.zoneEl === zoneEl) {
    state.listEl = listEl;
    state.instance.updateItems(items);
    return state.instance;
  }

  destroyPatientActiveZoneVirtual();
  state.zoneEl = zoneEl;
  state.listEl = listEl;
  state.instance = createVirtualScroll({
    container: zoneEl,
    items,
    estimateItemHeight: PATIENT_ACTIVE_ITEM_STRIDE,
    overscan: 3,
    renderItem,
  });
  return state.instance;
}

/**
 * @param {{ items: object[], renderCardHtml: (p: object) => string, ctx: object }} options
 * @returns {boolean}
 */
export function updatePatientActiveZoneVirtual(options) {
  if (!state.instance || !state.zoneEl || !state.listEl) return false;
  const { items, renderCardHtml, ctx } = options;
  state.zoneEl.setAttribute(
    'data-active-ids',
    items.map((p) => String(p.id || '')).join(',')
  );
  state.instance.destroy();
  state.instance = createVirtualScroll({
    container: state.zoneEl,
    items,
    estimateItemHeight: PATIENT_ACTIVE_ITEM_STRIDE,
    overscan: 3,
    renderItem: ({ item }) => renderPatientCardElement(item, renderCardHtml, ctx),
  });
  syncActiveZoneMaxHeight(state.listEl, state.zoneEl);
  return true;
}

/**
 * @param {HTMLElement} list
 * @param {{ zones: object, archivedCollapsed: boolean, patientSearchFilter?: string, renderCard: (p: object) => string, ctx: object, onRondaNav?: (zones: object) => void }} options
 * @returns {boolean}
 */
export function trySilentVirtualPatientListPatch(list, options) {
  if (!list || options.patientSearchFilter) return false;
  if (!shouldVirtualizeActiveZone(options.zones.active.length)) return false;
  if (!list.querySelector('.patient-sort-zone--virtual-active[data-patient-zone="active"]')) return false;
  if (!state.instance) return false;

  const desired = virtualPatientListStructureSignature(options.zones, options.archivedCollapsed);
  const current = readVirtualPatientListStructure(list, options.archivedCollapsed);
  if (desired !== current) return false;

  syncSectionCounts(list, options.zones);
  const ctx = options.ctx || {};
  const pinned = list.querySelector('.patient-sort-zone[data-patient-zone="pinned"]');
  if (options.zones.pinned.length && pinned) {
    syncZoneCards(pinned, options.zones.pinned, options.renderCard, ctx);
  }
  const archived = list.querySelector('.patient-sort-zone[data-patient-zone="archived"]');
  if (options.zones.archived.length && archived && !options.archivedCollapsed) {
    syncZoneCards(archived, options.zones.archived, options.renderCard, ctx);
  }
  updatePatientActiveZoneVirtual({
    items: options.zones.active,
    renderCardHtml: options.renderCard,
    ctx,
  });
  if (typeof options.onRondaNav === 'function') options.onRondaNav(options.zones);
  return true;
}

/** @param {HTMLElement} list @param {{ pinned: object[], active: object[], archived: object[] }} zones @param {boolean} archivedCollapsed */
export function stampVirtualPatientListStructure(list, zones, archivedCollapsed) {
  if (!list) return;
  list.setAttribute(
    'data-patient-list-virtual',
    virtualPatientListStructureSignature(zones, archivedCollapsed)
  );
}
