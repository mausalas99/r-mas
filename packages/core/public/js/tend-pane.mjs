/**
 * Tendencias side pane host (#tend-pane). One mode at a time: 'analito' | 'estudio' | 'pivot'.
 * Each mode owns a panel inside the pane and registers its close function.
 * Open/close only toggles the layout; panel content stays with its own module.
 */

import { aid } from './features/tendencias-state.mjs';

var closers = Object.create(null);
var current = null;
var wired = false;
var paneAid = null;
var selectedKey = null;
var pivotApi = null;
var pivotOpener = null;

function paneEl() {
  return typeof document !== 'undefined' ? document.getElementById('tend-pane') : null;
}

function layoutEl() {
  return typeof document !== 'undefined' ? document.getElementById('tend-split') : null;
}

export function registerTendPane(mode, closeFn) {
  closers[mode] = closeFn;
}

export function currentTendPaneMode() {
  return current;
}

function applyState(mode) {
  var pane = paneEl();
  var layout = layoutEl();
  if (layout) {
    layout.classList.toggle('is-open', !!mode);
    layout.classList.toggle('is-pivot', mode === 'pivot');
  }
  if (!pane) return;
  // data-mode stays after close so the panel fades out with its content still visible.
  if (mode) pane.setAttribute('data-mode', mode);
  pane.toggleAttribute('inert', !mode);
  pane.setAttribute('aria-hidden', mode ? 'false' : 'true');
}

/** Selected-row tint follows the open analyte; cleared for other modes. */
export function markTendSelectedRow(seriesKey) {
  selectedKey = seriesKey || null;
  var root = document.getElementById('tendencias-container');
  if (!root) return;
  root.querySelectorAll('.tend-row.is-selected').forEach(function (r) {
    r.classList.remove('is-selected');
    r.removeAttribute('aria-current');
  });
  if (!seriesKey) return;
  root.querySelectorAll('.tend-row').forEach(function (r) {
    if (r.getAttribute('data-series-key') === seriesKey) {
      r.classList.add('is-selected');
      r.setAttribute('aria-current', 'true');
    }
  });
}

/**
 * Pivot mode: every list row carries a checkbox. The pivot module owns the selection
 * ({ getSelectedKeys, toggleSeries, onSelectionChange }); the ticks only mirror it.
 */
export function registerTendPivotApi(api) {
  pivotApi = api;
  api.onSelectionChange(syncPivotTicks);
}

export function syncPivotTicks() {
  var root = document.getElementById('tendencias-container');
  if (!root || current !== 'pivot' || !pivotApi) return;
  var keys = pivotApi.getSelectedKeys();
  root.querySelectorAll('.tend-row[data-series-key]').forEach(function (r) {
    var box = r.querySelector('.tend-row-tick');
    var on = keys.indexOf(r.getAttribute('data-series-key')) >= 0;
    if (box) box.checked = on;
    r.classList.toggle('is-ticked', on);
  });
}

/** The shell registers how to open the pivot pane; other modes (analito) call it without importing the shell. */
export function setTendPivotOpener(fn) {
  pivotOpener = fn;
}

export function openTendPivotWith(seriesKey) {
  if (pivotOpener) pivotOpener(seriesKey);
}

/** Row click while in pivot mode. Returns true if it was handled. */
export function toggleTendPivotRow(seriesKey) {
  if (current !== 'pivot' || !pivotApi) return false;
  pivotApi.toggleSeries(seriesKey);
  return true;
}

/** Open the pane in `mode`; the previous mode (if any) is closed first. */
export function showTendPane(mode) {
  initTendPane();
  if (current && current !== mode) {
    var prev = current;
    current = null; // its own hideTendPane() becomes a no-op
    if (typeof closers[prev] === 'function') closers[prev]();
  }
  current = mode;
  if (mode !== 'analito') markTendSelectedRow(null);
  paneAid = aid();
  applyState(mode);
}

/** After the list re-renders: close if the patient changed, else restore the selected-row tint. */
export function syncTendPaneAfterRender() {
  if (!current) return;
  if (aid() !== paneAid) closeTendPane();
  else if (current === 'analito') markTendSelectedRow(selectedKey);
  else syncPivotTicks();
}

/** Called by a mode when it closes itself. No-op if another mode already took over. */
export function hideTendPane(mode) {
  if (current !== mode) return;
  current = null;
  applyState(null);
  markTendSelectedRow(null);
}

export function closeTendPane() {
  if (current && typeof closers[current] === 'function') closers[current]();
}

function isTypingTarget(el) {
  if (!el || !el.tagName) return false;
  var tag = el.tagName;
  if (tag === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) return false;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.isContentEditable === true;
}

export function initTendPane() {
  if (wired || typeof document === 'undefined') return;
  wired = true;
  // Bubble phase on purpose: the shared modal dismiss handler (capture) consumes Esc
  // when any registered modal is open, so this only sees a free Esc.
  document.addEventListener('keydown', function (ev) {
    if (!current || ev.defaultPrevented) return;
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    if (isTypingTarget(ev.target)) return;
    ev.preventDefault();
    closeTendPane();
  });
  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('.tend-pane-close') : null;
    if (!btn) return;
    ev.preventDefault();
    closeTendPane();
  });
}
